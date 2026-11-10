import * as THREE from "three";
import { WATER_Y } from "./pondShape";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// How quickly the character settles onto a new height, so the climb up the rocks is smooth
const GROUND_FOLLOW_SPEED = 16;

const LOOK_DOWN_SECONDS = 1.1;
const REFLECTION_FADE_SECONDS = 0.9;
const HEAD_DOWN = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(THREE.MathUtils.degToRad(30), 0, 0)
);
// Where the camera goes to look down at the reflection, measured from the character's feet
const VIEW_DISTANCE = 27;
const VIEW_HEIGHT = 44;
// How far under the water the camera aims, which puts the reflection above the dialog box
const VIEW_AIM_DEPTH = 16;

const HOP_SECONDS = 0.35;
const SINK_SECONDS = 0.55;
const SURFACE_SECONDS = 0.9;
const HOP_HEIGHT = 7;
const SINK_DEPTH = 26;

const _toCamera = new THREE.Vector3();

export function createLakeState() {
  return {
    // none -> lookingDown -> reflecting -> none, or none -> hopping -> sinking -> surfacing, then
    // none coming back up or fighting on the way into the upside-down world, until the fight ends
    phase: "none",
    // Set once the rocks have loaded
    ground: null,
    inWater: false,
    // Whether the character is in the upside-down world
    flipped: false,
    progress: 0,
    // How far the view has moved to the reflection, from 0 to 1
    reflection: 0,
    viewDirection: new THREE.Vector3(1, 0, 1).normalize(),
    surfaceY: WATER_Y,
    // How far the picture has turned, in radians
    roll: 0,
    rollFrom: 0,
    jumpSeconds: 0,
    // How strong the watery filter is, and how much of the screen the water has covered
    underwater: 0,
    flood: 0,
  };
}

export function isJumping(phase) {
  return phase === "hopping" || phase === "sinking" || phase === "surfacing";
}

export function startReflection(lake, character, camera) {
  lake.phase = "lookingDown";
  lake.progress = 0;
  _toCamera.subVectors(camera.position, character.position).setY(0);
  if (_toCamera.lengthSq() > 0) lake.viewDirection.copy(_toCamera).normalize();
}

export function stopReflection(lake) {
  lake.phase = "none";
}

export function startJump(lake, character) {
  lake.phase = "hopping";
  lake.progress = 0;
  lake.surfaceY = character.position.y;
  lake.rollFrom = lake.flipped ? Math.PI : 0;
  lake.jumpSeconds = 0;
}

export function endFight(lake, character, jumpOut) {
  lake.phase = "none";
  if (jumpOut) startJump(lake, character);
}

export function resetLake(lake) {
  lake.phase = "none";
  lake.inWater = false;
  lake.flipped = false;
  lake.progress = 0;
  lake.reflection = 0;
  lake.roll = 0;
  lake.underwater = 0;
  lake.flood = 0;
}

export function followGround(lake, character, delta) {
  if (!lake.ground) return;
  const { x, y, z } = character.position;
  const height = lake.ground.heightAt(x, z);
  character.position.y = y + (height - y) * Math.min(1, delta * GROUND_FOLLOW_SPEED);
}

// The picture keeps turning through the whole dive and rise, and most of that is behind the flood
function updateRoll(lake, delta) {
  lake.jumpSeconds += delta;
  if (REDUCED_MOTION) {
    lake.roll = lake.flipped ? Math.PI : 0;
    return;
  }
  const totalSeconds = SINK_SECONDS + SURFACE_SECONDS;
  const turned = THREE.MathUtils.smoothstep(lake.jumpSeconds, 0, totalSeconds);
  lake.roll = lake.rollFrom + turned * Math.PI;
}

// Runs every frame. Returns true while the lake is in charge of moving the character.
export function updateLake(lake, character, delta, wantsToMove, turnTowards) {
  const looking = lake.phase === "lookingDown" || lake.phase === "reflecting";
  const fade = delta / REFLECTION_FADE_SECONDS;
  lake.reflection = THREE.MathUtils.clamp(lake.reflection + (looking ? fade : -fade), 0, 1);

  if (looking) {
    if (wantsToMove) {
      stopReflection(lake);
      return false;
    }
    turnTowards(_toCamera.copy(lake.viewDirection), delta);
    if (lake.phase === "lookingDown") {
      lake.progress += delta / LOOK_DOWN_SECONDS;
      if (lake.progress >= 1) lake.phase = "reflecting";
    }
    return true;
  }

  if (lake.phase === "hopping") {
    lake.progress = Math.min(1, lake.progress + delta / HOP_SECONDS);
    character.position.y = lake.surfaceY + Math.sin(Math.PI * lake.progress) * HOP_HEIGHT;
    if (lake.progress === 1) {
      lake.phase = "sinking";
      lake.progress = 0;
      lake.jumpSeconds = 0;
    }
    return true;
  }

  if (lake.phase === "sinking") {
    lake.progress = Math.min(1, lake.progress + delta / SINK_SECONDS);
    character.position.y = lake.surfaceY - SINK_DEPTH * lake.progress * lake.progress;
    lake.flood = THREE.MathUtils.smoothstep(lake.progress, 0.1, 0.95);
    updateRoll(lake, delta);
    if (lake.progress === 1) {
      lake.flipped = !lake.flipped;
      lake.underwater = lake.flipped ? 1 : 0;
      lake.phase = "surfacing";
      lake.progress = 0;
    }
    return true;
  }

  if (lake.phase === "surfacing") {
    lake.progress = Math.min(1, lake.progress + delta / SURFACE_SECONDS);
    const risen = 1 - (1 - lake.progress) ** 3;
    character.position.y = lake.surfaceY - SINK_DEPTH * (1 - risen);
    lake.flood = 1 - THREE.MathUtils.smoothstep(lake.progress, 0, 0.7);
    updateRoll(lake, delta);
    if (lake.progress === 1) {
      lake.phase = lake.flipped ? "fighting" : "none";
      lake.roll = lake.flipped ? Math.PI : 0;
      lake.flood = 0;
    }
    return true;
  }

  return lake.phase === "fighting";
}

// Tilts the head down once the walk clip has posed it
export function applyLakePose(lake, head) {
  if (lake.reflection > 0) head.quaternion.slerp(HEAD_DOWN, lake.reflection);
}

// Bends the camera from where it would usually be towards the view of the reflection
export function bendCameraToReflection(lake, position, lookAt, feet) {
  const blend = THREE.MathUtils.smoothstep(lake.reflection, 0, 1);
  if (blend === 0) return;
  position.lerp(
    _toCamera
      .copy(lake.viewDirection)
      .multiplyScalar(VIEW_DISTANCE)
      .add(feet)
      .setY(WATER_Y + VIEW_HEIGHT),
    blend
  );
  lookAt.lerp(_toCamera.copy(feet).setY(WATER_Y - VIEW_AIM_DEPTH), blend);
}
