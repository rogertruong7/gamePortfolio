import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JUMP_HEIGHT,
  JUMP_SECONDS,
  createJumpState,
  requestJump,
  setDown,
  updateJump,
} from "../src/Game/movement/jumping.js";

const STEP = 1 / 120;

function character(y = 0) {
  return { position: { y } };
}

// Runs whole frames the way the game does: off, then back on
function run(jump, body, seconds, canJump = true) {
  let highest = -Infinity;
  for (let t = 0; t < seconds; t += STEP) {
    setDown(jump, body);
    updateJump(jump, body, STEP, canJump);
    highest = Math.max(highest, body.position.y);
  }
  return highest;
}

test("a jump peaks at its height and lands where it started", () => {
  const jump = createJumpState();
  const body = character(-8);
  requestJump(jump);
  const highest = run(jump, body, JUMP_SECONDS + 0.1);
  assert.ok(Math.abs(highest - (-8 + JUMP_HEIGHT)) < 0.1, `peaked at ${highest}`);
  assert.equal(body.position.y, -8);
  assert.equal(jump.airborne, false);
});

test("pressing again in the air doesn't jump again", () => {
  const jump = createJumpState();
  const body = character();
  requestJump(jump);
  run(jump, body, JUMP_SECONDS / 2);
  requestJump(jump);
  const highest = run(jump, body, JUMP_SECONDS);
  assert.ok(highest <= JUMP_HEIGHT + 0.01);
  assert.equal(body.position.y, 0);
});

test("a press is forgotten while something else is moving the character", () => {
  const jump = createJumpState();
  const body = character();
  requestJump(jump);
  run(jump, body, 0.1, false);
  assert.equal(body.position.y, 0);
  run(jump, body, 0.2);
  assert.equal(body.position.y, 0);
});

test("the ground can move under a jump without the jump drifting", () => {
  const jump = createJumpState();
  const body = character();
  requestJump(jump);
  let frames = 0;
  for (let t = 0; t < JUMP_SECONDS + 0.1; t += STEP) {
    setDown(jump, body);
    // Walking up a slope while in the air
    body.position.y += 0.01;
    updateJump(jump, body, STEP, true);
    frames += 1;
  }
  assert.ok(Math.abs(body.position.y - frames * 0.01) < 1e-9);
});
