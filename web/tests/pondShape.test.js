import assert from "node:assert/strict";
import { test } from "node:test";
import { createGroundMap, WATER_Y } from "../src/Game/lake/pondShape.js";

const FLOOR_Y = -8;
const MIDDLE_OF_POND = [160, -96];
const OUT_ON_THE_GRASS = [100, -40];
// On the pond's western edge
const ROCK_SPOT = [134, -96];
const ROCK_TOP = -4;

// A flat square of rock, as two triangles
function rockAt([x, z], height, half = 8) {
  const corner = (dx, dz) => [x + dx, height, z + dz];
  return [
    [corner(-half, -half), corner(half, -half), corner(half, half)],
    [corner(-half, -half), corner(half, half), corner(-half, half)],
  ];
}

const map = createGroundMap(rockAt(ROCK_SPOT, ROCK_TOP));

test("the floor stays at floor height away from the pond", () => {
  assert.equal(map.heightAt(...OUT_ON_THE_GRASS), FLOOR_Y);
});

test("the character stands a little below the surface in open water", () => {
  const height = map.heightAt(...MIDDLE_OF_POND);
  assert.ok(height < WATER_Y);
  assert.ok(height > WATER_Y - 2);
});

test("the character stands on top of a rock", () => {
  assert.ok(Math.abs(map.heightAt(...ROCK_SPOT) - ROCK_TOP) < 0.01);
});

test("the height climbs gradually at the edge of a rock", () => {
  let previous = map.heightAt(ROCK_SPOT[0] - 14, ROCK_SPOT[1]);
  for (let x = ROCK_SPOT[0] - 13.75; x <= ROCK_SPOT[0]; x += 0.25) {
    const height = map.heightAt(x, ROCK_SPOT[1]);
    assert.ok(height - previous < 0.8, `jumps ${height - previous} at x ${x}`);
    previous = height;
  }
});

test("only open water counts as water", () => {
  assert.equal(map.isWater(...MIDDLE_OF_POND), true);
  assert.equal(map.isWater(...ROCK_SPOT), false);
  assert.equal(map.isWater(...OUT_ON_THE_GRASS), false);
});

test("the character walks through the bushes in the rock mesh, not over them", () => {
  const bush = [161, -39];
  const withBush = createGroundMap([...rockAt(ROCK_SPOT, ROCK_TOP), ...rockAt(bush, 0.6, 5)]);
  assert.equal(withBush.heightAt(...bush), FLOOR_Y);
  assert.ok(Math.abs(withBush.heightAt(...ROCK_SPOT) - ROCK_TOP) < 0.01);
});

test("a rock under the surface doesn't get in the way", () => {
  const sunken = createGroundMap(rockAt(MIDDLE_OF_POND, WATER_Y - 3));
  assert.equal(sunken.isWater(...MIDDLE_OF_POND), true);
  assert.ok(sunken.heightAt(...MIDDLE_OF_POND) < WATER_Y);
});
