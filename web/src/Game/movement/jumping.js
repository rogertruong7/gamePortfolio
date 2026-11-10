// A small hop on Space. It only ever changes the character's height, so walking, turning and
// sliding along walls carry on exactly as they would on the ground, and the player can change
// direction in the air.

// In world units, where the character stands about 20 tall
export const JUMP_HEIGHT = 4.5;
export const JUMP_SECONDS = 0.42;
// Thrown up at this speed and pulled back by this much, it peaks at JUMP_HEIGHT halfway through
const LAUNCH_SPEED = (4 * JUMP_HEIGHT) / JUMP_SECONDS;
const GRAVITY = (8 * JUMP_HEIGHT) / (JUMP_SECONDS * JUMP_SECONDS);

export function createJumpState() {
  return { requested: false, airborne: false, height: 0, seconds: 0 };
}

export function requestJump(jump) {
  jump.requested = true;
}

// Takes the hop back off before anything else moves the character this frame, so following the
// ground and walking work from where its feet would be
export function setDown(jump, character) {
  character.position.y -= jump.height;
}

// Puts the hop back on after everything else has moved the character. When something else is in
// charge of it, like sitting or the pond, any hop just ends and a press is forgotten.
export function updateJump(jump, character, delta, canJump) {
  if (!canJump) {
    Object.assign(jump, createJumpState());
    return;
  }
  // No second jump in the air
  if (jump.requested && !jump.airborne) {
    jump.airborne = true;
    jump.seconds = 0;
  }
  jump.requested = false;
  if (jump.airborne) {
    // Worked out from the time since take-off, so it's the same hop at any frame rate
    jump.seconds += delta;
    const t = jump.seconds;
    jump.height = t >= JUMP_SECONDS ? 0 : LAUNCH_SPEED * t - (GRAVITY * t * t) / 2;
    if (t >= JUMP_SECONDS) Object.assign(jump, createJumpState());
  }
  character.position.y += jump.height;
}
