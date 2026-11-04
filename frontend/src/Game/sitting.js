import * as THREE from "three";
import { benches } from "./Static";

const FLOOR_Y = -8;
// The seat is taller than the character's legs, so its feet dangle once it's up there
const SEATED_Y = -4.75;
const HOP_HEIGHT = 2.5;
// How far in front of the bench's middle it stands, and how far forward on the seat it sits
const STAND_DISTANCE = 9;
const SIT_DISTANCE = 2.3;
const REACH = 18;
// The closest the bench's hitbox lets the character get to its middle, in front and at the ends
const CLEAR_IN_FRONT = 8.5;
const CLEAR_AT_ENDS = 17;

const WALK_SPEED = 100;
const SIT_SECONDS = 0.7;
const STAND_SECONDS = 0.5;

const FOOT_SWING_DEGREES = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 11;
const FOOT_SWING_SPEED = 2.2;
const SHIN_DEGREES = 72;

const _toNextStop = new THREE.Vector3();
const _swing = new THREE.Quaternion();
const _swingEuler = new THREE.Euler();

function degrees(x, y = 0, z = 0) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z)
    )
  );
}

// Every bone shares the model's axes: +x is its left, +y is up and +z is forward.
// So a negative x swings a limb forward, and a positive x swings it back.
const SIT_POSE = new Map([
  ["Hips_100_03", degrees(0)],
  ["Spine_110_04", degrees(3)],
  ["Head_210_015", degrees(5)],
  ["LeftUpLeg_300_022", degrees(-82, 0, 6)],
  ["RightUpLeg_400_024", degrees(-82, 0, -6)],
  ["LeftShoulder_500_05", degrees(0)],
  ["RightShoulder_600_09", degrees(0)],
  ["LeftArm_510_06", degrees(-38, 0, -22)],
  ["RightArm_610_010", degrees(-38, 0, 22)],
  ["LeftForeArm_520_07", degrees(-30, 0, -12)],
  ["RightForeArm_620_011", degrees(-30, 0, 12)],
  ["LeftHand_530_00", degrees(0)],
  ["RightHand_630_012", degrees(0)],
]);
const LEFT_SHIN = "LeftLeg_310_023";
const RIGHT_SHIN = "RightLeg_410_025";
const HIPS = "Hips_100_03";
const HIPS_REST = new THREE.Vector3(0, 2.25, 0.2);

export function findSitBones(scene) {
  const bones = {};
  [...SIT_POSE.keys(), LEFT_SHIN, RIGHT_SHIN].forEach((name) => {
    bones[name] = scene.getObjectByName(name);
  });
  return bones;
}

export function createSitState() {
  return {
    phase: "none", // none -> approaching -> sittingDown -> seated -> standingUp -> none
    bench: null,
    route: [],
    near: null,
    progress: 0,
    fromX: 0,
    fromZ: 0,
    fromAngle: 0,
    // Tells a new click on the floor apart from the one that's already been dealt with
    clickTarget: null,
  };
}

export function nearestBench(position) {
  return (
    benches.find(
      ({ seat }) => Math.hypot(position.x - seat[0], position.z - seat[1]) < REACH
    ) ?? null
  );
}

// A spot measured from the bench's middle: along its length, and out in the way it faces
function benchPoint({ seat, facing }, along, out) {
  return new THREE.Vector3(
    seat[0] + facing[0] * out - facing[1] * along,
    FLOOR_Y,
    seat[1] + facing[1] * out + facing[0] * along
  );
}

// From beside or behind the bench, the walk goes around its nearer end rather than through it
function routeToBench(bench, position) {
  const standSpot = benchPoint(bench, 0, STAND_DISTANCE);
  const offsetX = position.x - bench.seat[0];
  const offsetZ = position.z - bench.seat[1];
  const out = offsetX * bench.facing[0] + offsetZ * bench.facing[1];
  if (out >= CLEAR_IN_FRONT) return [standSpot];

  const along = offsetZ * bench.facing[0] - offsetX * bench.facing[1];
  const end = along >= 0 ? CLEAR_AT_ENDS : -CLEAR_AT_ENDS;
  return [benchPoint(bench, end, out), benchPoint(bench, end, STAND_DISTANCE), standSpot];
}

export function startSitting(sit, bench, clickTarget, position) {
  sit.phase = "approaching";
  sit.bench = bench;
  sit.clickTarget = clickTarget;
  sit.route = routeToBench(bench, position);
}

export function startStanding(sit) {
  const standSpot = benchPoint(sit.bench, 0, STAND_DISTANCE);
  sit.phase = "standingUp";
  sit.fromX = standSpot.x;
  sit.fromZ = standSpot.z;
  sit.fromAngle = facingAngle(sit.bench);
}

// Character.jsx turns its model with this offset from the direction it walks in
function facingAngle(bench) {
  return Math.atan2(bench.facing[0], bench.facing[1]) - Math.PI / 2;
}

function shortestTurn(from, to) {
  return THREE.MathUtils.euclideanModulo(to - from + Math.PI, 2 * Math.PI) - Math.PI;
}

function placeOnBench(character, sit) {
  const { progress, bench } = sit;
  const moved = THREE.MathUtils.smoothstep(progress, 0, 1);
  const seatX = bench.seat[0] + bench.facing[0] * SIT_DISTANCE;
  const seatZ = bench.seat[1] + bench.facing[1] * SIT_DISTANCE;

  character.position.x = THREE.MathUtils.lerp(sit.fromX, seatX, moved);
  character.position.z = THREE.MathUtils.lerp(sit.fromZ, seatZ, moved);
  character.position.y =
    THREE.MathUtils.lerp(FLOOR_Y, SEATED_Y, moved) + Math.sin(Math.PI * moved) * HOP_HEIGHT;

  // It turns around in the first half, before it hops backwards onto the seat
  const turned = THREE.MathUtils.smoothstep(progress, 0, 0.5);
  character.rotation.y =
    sit.fromAngle + shortestTurn(sit.fromAngle, facingAngle(bench)) * turned;
}

// Runs each frame while the character is doing anything other than walking around freely.
// walkTowards turns the character to face the way it's going.
export function updateSit(sit, character, delta, wantsToMove, walkTowards) {
  if (sit.phase === "approaching") {
    if (wantsToMove) {
      sit.phase = "none";
      return;
    }
    _toNextStop.copy(sit.route[0]).sub(character.position);
    const step = WALK_SPEED * delta;
    if (_toNextStop.length() > step) {
      _toNextStop.setLength(step);
      character.position.add(_toNextStop);
      walkTowards(_toNextStop, delta);
      return;
    }
    character.position.add(_toNextStop);
    sit.route.shift();
    if (sit.route.length > 0) return;

    sit.phase = "sittingDown";
    sit.progress = 0;
    sit.fromX = character.position.x;
    sit.fromZ = character.position.z;
    sit.fromAngle = character.rotation.y;
    return;
  }

  if (sit.phase === "sittingDown" || sit.phase === "seated") {
    if (wantsToMove) {
      startStanding(sit);
      return;
    }
  }

  if (sit.phase === "sittingDown") {
    sit.progress = Math.min(1, sit.progress + delta / SIT_SECONDS);
    placeOnBench(character, sit);
    if (sit.progress === 1) sit.phase = "seated";
  } else if (sit.phase === "standingUp") {
    sit.progress = Math.max(0, sit.progress - delta / STAND_SECONDS);
    placeOnBench(character, sit);
    if (sit.progress === 0) sit.phase = "none";
  }
}

// How far the body has folded into the sitting pose. The legs lift just after the hop starts.
function poseWeight(sit) {
  if (sit.phase === "none" || sit.phase === "approaching") return 0;
  return THREE.MathUtils.smoothstep(sit.progress, 0.15, 0.85);
}

// Goes after the mixer has moved the bones, so it bends the walk clip's pose towards sitting
export function applySitPose(sit, bones, seconds) {
  const weight = poseWeight(sit);
  if (weight === 0) return;

  SIT_POSE.forEach((pose, name) => {
    bones[name].quaternion.slerp(pose, weight);
  });
  bones[HIPS].position.lerp(HIPS_REST, weight);

  const swing = Math.sin(seconds * FOOT_SWING_SPEED) * FOOT_SWING_DEGREES;
  const toRadians = THREE.MathUtils.degToRad;
  _swing.setFromEuler(_swingEuler.set(toRadians(SHIN_DEGREES + swing), 0, 0));
  bones[LEFT_SHIN].quaternion.slerp(_swing, weight);
  _swing.setFromEuler(_swingEuler.set(toRadians(SHIN_DEGREES - swing), 0, 0));
  bones[RIGHT_SHIN].quaternion.slerp(_swing, weight);
}
