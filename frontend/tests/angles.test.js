import assert from "node:assert/strict";
import { test } from "node:test";
import { turnTowardsAngle } from "../src/Game/angles.js";

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} isn't ${b}`);

test("stays put at the start and arrives at the end", () => {
  close(turnTowardsAngle(1, 0, 0), 1);
  close(turnTowardsAngle(1, 0, 1), 0);
});

test("takes the short way round", () => {
  // From just short of a full turn, the centre is only a little further on
  close(turnTowardsAngle(Math.PI * 1.9, 0, 0.5), Math.PI * 1.95);
});

test("unwinds a camera that has been dragged around many times", () => {
  const wound = Math.PI * 8 + 0.3;
  close(turnTowardsAngle(wound, 0, 1), Math.PI * 8);
  close(turnTowardsAngle(wound, 0, 0.5), Math.PI * 8 + 0.15);
});
