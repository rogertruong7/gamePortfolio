import * as THREE from "three";

// Every bone shares the model's axes: +x is its left, +y is up and +z is forward. Each arm rests
// pointing down and out at 45 degrees, so a pose is written as the way each part of the arm points.
const REST_RIGHT = new THREE.Vector3(-1, -1, 0).normalize();
const REST_LEFT = new THREE.Vector3(1, -1, 0).normalize();

const BONES = {
  hips: "Hips_100_03",
  spine: "Spine_110_04",
  head: "Head_210_015",
  rightArm: "RightArm_610_010",
  rightForeArm: "RightForeArm_620_011",
  leftArm: "LeftArm_510_06",
  leftForeArm: "LeftForeArm_520_07",
  leftLeg: "LeftUpLeg_300_022",
  rightLeg: "RightUpLeg_400_024",
};

// The camera is above the character, so it tips its head back to look up into it
const LOOK_UP_DEGREES = -14;

const _upper = new THREE.Vector3();
const _lower = new THREE.Vector3();
const _upperTurn = new THREE.Quaternion();
const _lowerTurn = new THREE.Quaternion();
const _turn = new THREE.Quaternion();
const _euler = new THREE.Euler();

function aimArm(upperBone, lowerBone, rest, upper, lower, weight) {
  _upperTurn.setFromUnitVectors(rest, _upper.set(...upper).normalize());
  upperBone.quaternion.slerp(_upperTurn, weight);
  // The forearm is turned relative to the upper arm it hangs from
  _lowerTurn.setFromUnitVectors(rest, _lower.set(...lower).normalize());
  _turn.copy(_upperTurn).invert().multiply(_lowerTurn);
  lowerBone.quaternion.slerp(_turn, weight);
}

function tilt(bone, xDegrees, yDegrees, zDegrees, weight) {
  const toRadians = THREE.MathUtils.degToRad;
  _euler.set(toRadians(xDegrees), toRadians(yDegrees), toRadians(zDegrees));
  bone.quaternion.slerp(_turn.setFromEuler(_euler), weight);
}

function poseWave(bones, weight, seconds) {
  const swing = Math.sin(seconds * 9);
  aimArm(
    bones.rightArm,
    bones.rightForeArm,
    REST_RIGHT,
    [-0.8, 0.25, 0.55],
    [-0.5 + swing * 0.55, 0.75, 0.45],
    weight
  );
  // Leans away from the raised arm, which opens up room for it beside the head
  tilt(bones.spine, 0, 0, -8, weight);
  tilt(bones.head, LOOK_UP_DEGREES, 0, -9 + swing * 2, weight);
}

function poseDab(bones, weight, seconds) {
  const pulse = Math.sin(seconds * 5) * 2;
  aimArm(bones.rightArm, bones.rightForeArm, REST_RIGHT, [-0.95, 0.08, 0.35], [-0.92, 0.2, 0.35], weight);
  // The other arm comes up and across the face, with the head tipped over towards it
  aimArm(bones.leftArm, bones.leftForeArm, REST_LEFT, [0.5, 0.45, 0.74], [-0.85, 0.35, 0.4], weight);
  tilt(bones.spine, 0, 0, -6, weight);
  tilt(bones.head, 6 + pulse, 0, -10, weight);
}

// The floss is a loop of six counts, with both arms swinging left, right, left, right while the
// hips go the opposite way. Mostly both arms stay in front of the body, and every third count the
// arm crossing over goes behind the back instead. Remember +x is the character's left and +z is
// forward.
//
// The arms start from opposite shoulders, so pointing the same way doesn't put the hands on the
// same side. The arm crossing over reaches higher and more directly across, which gets its hand
// past the body while still going around it. The one on its own side just hangs out to the side.
const ARM_SIDE = 0.8;
const CROSSING_DOWN = -0.3;
const CROSSING_REACH = 0.48;
const OWN_SIDE_DOWN = -0.55;
const OWN_SIDE_REACH = 0.85;
const REACHING_OUT_DOWN = -0.3;
const REACHING_OUT_FORWARD = 0.2;
const crossing = (side, frontOrBack) => [side * ARM_SIDE, CROSSING_DOWN, frontOrBack * CROSSING_REACH];
const ownSide = (side) => [side * ARM_SIDE, OWN_SIDE_DOWN, OWN_SIDE_REACH];
// While the other arm is behind the back, this one reaches further out to the side
const reachingOut = (side) => [side * ARM_SIDE, REACHING_OUT_DOWN, REACHING_OUT_FORWARD];
const LEFT = 1;
const RIGHT = -1;
const FRONT = 1;
const BEHIND = -1;
// The shoulders turn to help the crossing hand get further across: into the swing when it's going in
// front, and the other way when it's going behind
const armsLeft = (rightArm) => ({
  right: crossing(LEFT, rightArm),
  left: rightArm === BEHIND ? reachingOut(LEFT) : ownSide(LEFT),
  hipsX: -1,
  turn: rightArm,
});
const armsRight = (leftArm) => ({
  right: leftArm === BEHIND ? reachingOut(RIGHT) : ownSide(RIGHT),
  left: crossing(RIGHT, leftArm),
  hipsX: 1,
  turn: -leftArm,
});
export const FLOSS_COUNTS = [
  armsLeft(FRONT),
  armsRight(FRONT),
  armsLeft(BEHIND),
  armsRight(FRONT),
  armsLeft(FRONT),
  armsRight(BEHIND),
];
export const FLOSS_COUNT_SECONDS = 0.4;
// Much more than this swings the other hand round behind the body, even when it should be in front
const FLOSS_SHOULDER_TURN_DEGREES = 12;
// In the hips bone's own units, and the leg length in those same units
const FLOSS_HIPS_PUSH = 0.7;
// How far the upper body leans back over the feet to make up for the hips going the other way
const FLOSS_UPPER_BODY_LEAN_DEGREES = 21;
const LEG_LENGTH = 2.25;
const _hipsRest = new THREE.Vector3();

// Both hands and the hips swing left and right on one shared timing. An arm's change between front
// and back is instant, so it can't throw that timing off. It happens while the arm is well out on
// its own side where the body isn't in the way: just as it sets off to go behind the back, and
// just as it gets back. How far it reaches only changes smoothly.
const SWAP_MARGIN = 0.15;

function blendArm(from, to, ownSide, swing) {
  const swapping = Math.sign(from[2]) !== Math.sign(to[2]);
  const leavingOwnSide = Math.sign(from[0]) === ownSide;
  let reach = from[2] + (to[2] - from[2]) * swing;
  if (swapping) {
    const swapAt = leavingOwnSide ? SWAP_MARGIN : 1 - SWAP_MARGIN;
    reach = swing < swapAt ? from[2] : to[2];
  }
  return [from[0] + (to[0] - from[0]) * swing, from[1] + (to[1] - from[1]) * swing, reach];
}

// Where both arms point at this moment, and how far across the hips and shoulders have got
export function flossAt(seconds) {
  const count = seconds / FLOSS_COUNT_SECONDS;
  const from = FLOSS_COUNTS[Math.floor(count) % FLOSS_COUNTS.length];
  const to = FLOSS_COUNTS[(Math.floor(count) + 1) % FLOSS_COUNTS.length];
  const swing = THREE.MathUtils.smoothstep(count % 1, 0, 1);
  return {
    right: blendArm(from.right, to.right, -1, swing),
    left: blendArm(from.left, to.left, 1, swing),
    hipsSide: from.hipsX + (to.hipsX - from.hipsX) * swing,
    turn: from.turn + (to.turn - from.turn) * swing,
  };
}

function poseFloss(bones, weight, seconds) {
  const { right, left, hipsSide, turn } = flossAt(seconds);
  aimArm(bones.rightArm, bones.rightForeArm, REST_RIGHT, right, right, weight);
  aimArm(bones.leftArm, bones.leftForeArm, REST_LEFT, left, left, weight);

  const hipsX = hipsSide * FLOSS_HIPS_PUSH;
  bones.hips.position.copy(_hipsRest.copy(bones.hipsRest));
  bones.hips.position.x += hipsX * weight;

  // The legs lean by exactly as much as the hips moved, which keeps the feet where they are
  const legZ = -THREE.MathUtils.radToDeg(Math.atan(hipsX / LEG_LENGTH));
  tilt(bones.leftLeg, 0, 0, legZ, weight);
  tilt(bones.rightLeg, 0, 0, legZ, weight);

  // The upper body leans back the other way, so the head stays roughly over the feet, and the head
  // turns back against the shoulders to keep looking at the camera
  const shoulderTurn = turn * FLOSS_SHOULDER_TURN_DEGREES;
  const lean = hipsSide * FLOSS_UPPER_BODY_LEAN_DEGREES;
  tilt(bones.spine, 0, shoulderTurn, lean, weight);
  tilt(bones.head, LOOK_UP_DEGREES, -shoulderTurn, -lean, weight);
}

// To add an emote, add it here with a function that poses its bones, and give it a figure in
// EmoteWheel.jsx. Weight is how far into the pose it is, from 0 to 1, and seconds is how long
// the emote has been going. Seconds of Infinity keeps it going until the player moves, and
// leftArmInFront draws that arm over the head.
export const EMOTES = [
  { id: "wave", label: "Wave", seconds: Infinity, pose: poseWave },
  { id: "dab", label: "Dab", seconds: Infinity, pose: poseDab, leftArmInFront: true },
  { id: "floss", label: "Floss", seconds: Infinity, pose: poseFloss },
];

const FADE_SECONDS = 0.2;

const _toCamera = new THREE.Vector3();

// The arms are shorter than the head is deep, so no pose can really bring one out in front of the
// face. Instead the character's look material (look/lookMaterial.js) draws the left arm as if it
// were nearer while leftArmInFront is 1. It stays in the same place on screen and the same size.
export function findEmoteBones(scene, leftArmInFront) {
  const bones = {};
  Object.entries(BONES).forEach(([part, name]) => {
    bones[part] = scene.getObjectByName(name);
  });
  bones.hipsRest = new THREE.Vector3();
  bones.leftArmInFront = leftArmInFront;
  return bones;
}

export function createEmoteState() {
  return { emote: null, posing: false, seconds: 0 };
}

export function startEmote(state, emote) {
  state.emote = emote;
  state.seconds = 0;
}

export function stopEmote(state) {
  state.emote = null;
}

// Runs every frame. Moving, or anything else taking over the character, ends the emote early.
// Until then the character keeps turning to face the camera, even as the camera sways.
export function updateEmote(state, delta, interrupted, character, camera, turnTowards) {
  if (!state.emote) return;
  state.seconds += delta;
  if (interrupted || state.seconds >= state.emote.seconds) {
    stopEmote(state);
    return;
  }
  _toCamera.subVectors(camera.position, character.position).setY(0);
  if (_toCamera.lengthSq() > 0) turnTowards(_toCamera, delta);
}

// Goes after the mixer has moved the bones, so it bends the walk clip's pose towards the emote
export function applyEmotePose(state, bones) {
  if (!state.emote) {
    // The animation mixer only writes a value when it changes, and the walk clip's hips hold still
    // on the height axis, so anything the emote moved has to be put back by hand
    if (state.posing) bones.hips.position.copy(bones.hipsRest);
    bones.leftArmInFront.value = 0;
    state.posing = false;
    return;
  }
  // Measured here rather than up front, because the clip hasn't placed the hips until it has run
  if (!state.posing) bones.hipsRest.copy(bones.hips.position);
  state.posing = true;
  const { emote, seconds } = state;
  const weight = Math.min(
    THREE.MathUtils.smoothstep(seconds, 0, FADE_SECONDS),
    THREE.MathUtils.smoothstep(emote.seconds - seconds, 0, FADE_SECONDS)
  );
  bones.leftArmInFront.value = emote.leftArmInFront ? 1 : 0;
  emote.pose(bones, weight, seconds);
}
