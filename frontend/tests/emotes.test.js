import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import {
  EMOTES,
  FLOSS_COUNTS,
  FLOSS_COUNT_SECONDS,
  flossAt,
  createEmoteState,
  startEmote,
  updateEmote,
} from "../src/Game/emotes.js";

const WAVE = EMOTES.find(({ id }) => id === "wave");
const character = { position: new THREE.Vector3(0, 0, 0) };
const camera = { position: new THREE.Vector3(3, 9, 4) };
const ignoreTurn = () => {};

function waving() {
  const state = createEmoteState();
  startEmote(state, WAVE);
  return state;
}

test("wave, dab and floss are all there", () => {
  assert.deepEqual(
    EMOTES.map(({ id }) => id),
    ["wave", "dab", "floss"]
  );
});

test("every emote keeps going until the player moves", () => {
  for (const id of ["wave", "dab", "floss"]) {
    const emote = EMOTES.find((candidate) => candidate.id === id);
    const state = createEmoteState();
    startEmote(state, emote);
    updateEmote(state, 600, false, character, camera, ignoreTurn);
    assert.equal(state.emote, emote);
    updateEmote(state, 0.01, true, character, camera, ignoreTurn);
    assert.equal(state.emote, null);
  }
});

test("moving ends an emote straight away", () => {
  const state = waving();
  updateEmote(state, 0.01, true, character, camera, ignoreTurn);
  assert.equal(state.emote, null);
});

test("the character keeps turning to face the camera as it moves", () => {
  const state = waving();
  const turns = [];
  const remember = (direction) => turns.push(direction.toArray());
  updateEmote(state, 0.01, false, character, camera, remember);
  const swayed = { position: new THREE.Vector3(-5, 9, 2) };
  updateEmote(state, 0.01, false, character, swayed, remember);
  assert.deepEqual(turns, [
    [3, 0, 4],
    [-5, 0, 2],
  ]);
});

function everyMomentOfTheFloss(check) {
  const loop = FLOSS_COUNT_SECONDS * FLOSS_COUNTS.length;
  for (let seconds = 0; seconds < loop; seconds += loop / 400) {
    check(flossAt(seconds), seconds);
  }
}

test("the floss's hands swing left and right at the same time", () => {
  everyMomentOfTheFloss(({ right, left }, seconds) => {
    assert.equal(right[0], left[0], `the hands are apart at ${seconds}s`);
  });
});

test("the floss's arms change between front and back instantly, never part way", () => {
  everyMomentOfTheFloss(({ right, left }, seconds) => {
    assert.ok(Math.abs(right[2]) >= 0.2, `the right arm is part way at ${seconds}s`);
    assert.ok(Math.abs(left[2]) >= 0.2, `the left arm is part way at ${seconds}s`);
  });
});

test("at each end of a swing, both hands are out on that same side of the body", () => {
  // Worked out from the arm's direction alone, before the shoulders turn into the swing
  const SHOULDER = 15;
  const WHOLE_ARM = 29;
  const handSide = (shoulderSide, direction) =>
    shoulderSide * SHOULDER + (direction[0] / Math.hypot(...direction)) * WHOLE_ARM;
  for (const { right, left } of FLOSS_COUNTS) {
    const side = Math.sign(right[0]);
    assert.ok(handSide(-1, right) * side > 7, `the right hand stops at ${handSide(-1, right)}`);
    assert.ok(handSide(1, left) * side > 7, `the left hand stops at ${handSide(1, left)}`);
  }
});

test("the floss follows its six counts", () => {
  const describe = ({ right, left }) => {
    const side = right[0] > 0 ? "left" : "right";
    const front = (arm) => (arm[2] > 0 ? "front" : "behind");
    return `${side}: right ${front(right)}, left ${front(left)}`;
  };
  assert.deepEqual(FLOSS_COUNTS.map(describe), [
    "left: right front, left front",
    "right: right front, left front",
    "left: right behind, left front",
    "right: right front, left front",
    "left: right front, left front",
    "right: right front, left behind",
  ]);
});

test("the arm going behind the back stays there through the swings either side", () => {
  const nearly = FLOSS_COUNT_SECONDS * 0.7;
  const atCount = (count, offset) => flossAt(count * FLOSS_COUNT_SECONDS + offset);
  for (const offset of [-nearly, nearly]) {
    assert.ok(atCount(2, offset).right[2] < 0, "the right arm should be behind around count 3");
    assert.ok(atCount(5, offset).left[2] < 0, "the left arm should be behind around count 6");
    assert.ok(atCount(2, offset).left[2] > 0, "the left arm should stay in front around count 3");
    assert.ok(atCount(5, offset).right[2] > 0, "the right arm should stay in front around count 6");
  }
});

test("the arm in front reaches further out while the other is behind the back", () => {
  const sideways = ([side, down, forward]) => Math.abs(side) / Math.hypot(side, down, forward);
  const [countOne, , countThree, , , countSix] = FLOSS_COUNTS;
  assert.ok(sideways(countThree.left) > sideways(countOne.left));
  assert.ok(sideways(countSix.right) > sideways(FLOSS_COUNTS[1].right));
});

test("the floss's hips always go the opposite way to its arms", () => {
  for (const { right, left, hipsX } of FLOSS_COUNTS) {
    assert.equal(Math.sign(right[0]), Math.sign(left[0]));
    assert.equal(Math.sign(right[0]), -Math.sign(hipsX));
  }
});

test("the floss's arms never pass through the body", () => {
  // The arm sizes are measured from the bones. The body sizes are estimated from how it looks.
  const SHOULDER = 15;
  const UPPER_ARM = 15;
  const WHOLE_ARM = 29;
  const BODY_HALF_WIDTH = 10;
  const BODY_HALF_DEPTH = 7;
  const inBody = (side, direction, length) => {
    const size = Math.hypot(...direction);
    const x = side * SHOULDER + (direction[0] / size) * length;
    const z = (direction[2] / size) * length;
    return Math.abs(x) < BODY_HALF_WIDTH && Math.abs(z) < BODY_HALF_DEPTH;
  };
  everyMomentOfTheFloss(({ right, left }, seconds) => {
    for (const [side, direction] of [
      [-1, right],
      [1, left],
    ]) {
      assert.ok(!inBody(side, direction, WHOLE_ARM), `a hand is in the body at ${seconds}s`);
      assert.ok(!inBody(side, direction, UPPER_ARM), `an elbow is in the body at ${seconds}s`);
    }
  });
});
