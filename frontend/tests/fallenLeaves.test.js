import assert from "node:assert/strict";
import { test } from "node:test";
import { scatterFallenLeaves } from "../src/Game/fallenLeaves.js";
import { ISLAND_CENTRE, rimRadius } from "../src/Game/islandShape.js";

const FLOOR_Y = -8;
const TREES = [
  [33, -8, -219],
  [118, -8, -25],
  [195, -8, -101],
];
// Stands in for the pond and its rocks
const POND = { minX: 125, maxX: 195, minZ: -145, maxZ: -48 };
const isInPond = (x, z) => x > POND.minX && x < POND.maxX && z > POND.minZ && z < POND.maxZ;
const ground = { heightAt: (x, z) => (isInPond(x, z) ? -4 : FLOOR_Y) };

const leaves = scatterFallenLeaves(ground, TREES);

// The top of the raised kerb, measured from the floor model
const isOnKerb = ({ x, z }) =>
  (z < -21 && z > -187.5 && ((x > 72 && x < 77) || (x > 97.5 && x < 102))) ||
  (x > 77 && x < 218 && ((z > -187 && z < -184) || (z > -163.5 && z < -160.5)));

test("no leaf hangs off the island", () => {
  for (const { x, z } of leaves) {
    const angle = Math.atan2(z - ISLAND_CENTRE.z, x - ISLAND_CENTRE.x);
    const reach = Math.hypot(x - ISLAND_CENTRE.x, z - ISLAND_CENTRE.z);
    assert.ok(reach < rimRadius(angle) - 5, `${x}, ${z} is past the jags in the rim`);
  }
});

test("no leaf lands in the pond or on its rocks", () => {
  assert.ok(leaves.every(({ x, z }) => !isInPond(x, z)));
});

test("no leaf on the grass is buried in the kerb", () => {
  const onGrass = leaves.filter(({ y }) => y === FLOOR_Y + 0.1);
  assert.ok(onGrass.every((leaf) => !isOnKerb(leaf)));
});

test("no leaf lands where the buildings stand", () => {
  assert.ok(leaves.every(({ x, z }) => z > -186 && (x > 72 || z > -24)));
});

test("leaves land on both the path and the grass, resting just above each", () => {
  const onPath = leaves.filter(({ y }) => y === -7.75);
  const onGrass = leaves.filter(({ y }) => y === FLOOR_Y + 0.1);
  assert.equal(onPath.length + onGrass.length, leaves.length);
  assert.ok(onPath.length > 15);
  assert.ok(onGrass.length > 100);
});

test("the only leaves on the path are beside the tree at its end", () => {
  const onPath = leaves.filter(({ y }) => y === -7.75);
  assert.ok(onPath.every(({ x, z }) => Math.hypot(x - 118, z + 25) < 48));
});

test("the leaves land in the same places every time", () => {
  assert.deepEqual(scatterFallenLeaves(ground, TREES), leaves);
});
