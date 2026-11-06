import * as THREE from "three";

// The walk clip only swings the arms and legs, so the body glides along at one height. This adds
// what it leaves out, on top of whatever the clip has posed: the hips dip as each foot lands and
// rise as it passes, roll a little over the leg that's carrying the weight, and the whole body
// leans forward into the walk and into its turns. It all eases in and out with the walk.

const HIPS = "Hips_100_03";
const STRIDE_LEG = "LeftUpLeg_300_022.quaternion";

// In the hips bone's own units, where a leg is about 2.25 long
const BOB_HEIGHT = 0.09;
const ROLL_DEGREES = 2.5;
const LEAN_DEGREES = 6;
// How far it leans into a turn for each radian a second it's turning, and the most it will
const BANK_PER_TURN_SPEED = 2.2;
const MAX_BANK_DEGREES = 9;
// How quickly the walk comes in when it starts, and goes when it stops, in seconds
const EASE_IN_SECONDS = 0.15;
const EASE_OUT_SECONDS = 0.22;
// How quickly the lean into a turn follows the turning
const BANK_FOLLOW_SPEED = 10;

const toRadians = THREE.MathUtils.degToRad;
const LEFT = new THREE.Vector3(1, 0, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const _mean = new THREE.Quaternion();
const _key = new THREE.Quaternion();

// When in the clip the left leg is furthest from the middle of its swing. A foot lands then and
// half a cycle later, so that's where the hips should be lowest.
function findFootfall(clip) {
  const track = clip.tracks.find((t) => t.name === STRIDE_LEG);
  if (!track) return 0;
  const { times, values } = track;
  const sum = [0, 0, 0, 0];
  for (let i = 0; i < times.length; i += 1) {
    // Keys on the far side of the sphere point the same way, so they're flipped before adding
    const sign = i > 0 && values[i * 4 + 3] * values[3] + values[i * 4] * values[0] < 0 ? -1 : 1;
    for (let k = 0; k < 4; k += 1) sum[k] += sign * values[i * 4 + k];
  }
  _mean.set(...sum).normalize();
  let furthest = 0;
  let footfall = 0;
  for (let i = 0; i < times.length; i += 1) {
    _key.fromArray(values, i * 4);
    const angle = _key.angleTo(_mean);
    if (angle > furthest) {
      furthest = angle;
      footfall = times[i];
    }
  }
  return footfall;
}

export function createWalkFeel(scene, clip) {
  return {
    hips: scene.getObjectByName(HIPS),
    // Where the clip holds the hips, measured once it has run
    restPosition: null,
    restQuaternion: new THREE.Quaternion(),
    duration: clip.duration,
    footfall: findFootfall(clip),
    // 0 standing still to 1 walking
    weight: 0,
    bank: 0,
    lastYaw: null,
  };
}

// Runs after the mixer and before the emotes, sits and the lake pose the character. The clip
// holds the hips still, and the mixer only writes a value when it changes, so they're put back
// by hand each frame before anything is added.
export function updateWalkFeel(feel, { moving, delta, clipTime, yaw }) {
  const step = delta / (moving ? EASE_IN_SECONDS : EASE_OUT_SECONDS);
  feel.weight = THREE.MathUtils.clamp(feel.weight + (moving ? step : -step), 0, 1);

  // How fast it's turning, in radians a second, taking the short way round
  let turnSpeed = 0;
  if (feel.lastYaw !== null && delta > 0) {
    const turned = THREE.MathUtils.euclideanModulo(yaw - feel.lastYaw + Math.PI, 2 * Math.PI) - Math.PI;
    turnSpeed = turned / delta;
  }
  feel.lastYaw = yaw;
  const bankTarget = THREE.MathUtils.clamp(
    -turnSpeed * BANK_PER_TURN_SPEED,
    -MAX_BANK_DEGREES,
    MAX_BANK_DEGREES
  );
  feel.bank += (bankTarget - feel.bank) * (1 - Math.exp(-BANK_FOLLOW_SPEED * delta));

  const hips = feel.hips;
  if (!hips) return;
  if (!feel.restPosition) {
    feel.restPosition = hips.position.clone();
    feel.restQuaternion.copy(hips.quaternion);
  }
  hips.position.copy(feel.restPosition);
  hips.quaternion.copy(feel.restQuaternion);
  const amount = THREE.MathUtils.smoothstep(feel.weight, 0, 1);
  if (amount === 0) return;

  // 0 when the left foot lands, going once round for every full stride
  const cycle = (2 * Math.PI * (clipTime - feel.footfall)) / feel.duration;
  // Lowest as each foot lands, highest as the legs pass each other
  hips.position.y -= BOB_HEIGHT * amount * (0.5 + 0.5 * Math.cos(2 * cycle));

  const lean = toRadians(LEAN_DEGREES) * amount;
  const roll = toRadians(ROLL_DEGREES * Math.sin(cycle) + feel.bank) * amount;
  hips.quaternion.premultiply(_q.setFromAxisAngle(LEFT, lean));
  hips.quaternion.premultiply(_q.setFromAxisAngle(FORWARD, roll));
}
