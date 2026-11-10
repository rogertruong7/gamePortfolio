import assert from "node:assert/strict";
import { test } from "node:test";
import { createPathfinder } from "../src/Game/movement/pathfinding.js";

const RADIUS = 5;
const BOUNDS = { minX: 0, maxX: 200, minZ: 0, maxZ: 200 };

// The same shape as RotatedBox in Static.jsx, which needs three.js to import
function box(x1, z1, x2, z2, thickness = 7) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const angle = Math.atan2(dz, dx);
  return {
    cx: (x1 + x2) / 2,
    cz: (z1 + z2) / 2,
    halfW: Math.hypot(dx, dz) / 2,
    halfD: thickness / 2,
    cos: Math.cos(angle),
    sin: Math.sin(angle),
  };
}

// The same test the character's collision uses: how far is this point from the box?
function distanceToBox(b, x, z) {
  const dx = x - b.cx;
  const dz = z - b.cz;
  const u = dx * b.cos + dz * b.sin;
  const v = -dx * b.sin + dz * b.cos;
  const overU = Math.max(0, Math.abs(u) - b.halfW);
  const overV = Math.max(0, Math.abs(v) - b.halfD);
  return Math.hypot(overU, overV);
}

// Walks the path in small steps, failing if the character would bump into anything
function assertWalkable(path, from, boxes) {
  let previous = from;
  for (const stop of path) {
    const steps = Math.ceil(Math.hypot(stop.x - previous.x, stop.z - previous.z) * 4) || 1;
    for (let i = 0; i <= steps; i += 1) {
      const x = previous.x + ((stop.x - previous.x) * i) / steps;
      const z = previous.z + ((stop.z - previous.z) * i) / steps;
      for (const b of boxes) {
        assert.ok(distanceToBox(b, x, z) > RADIUS, `bumps a box at ${x}, ${z}`);
      }
    }
    previous = stop;
  }
}

function pathLength(path, from) {
  let total = 0;
  let previous = from;
  for (const stop of path) {
    total += Math.hypot(stop.x - previous.x, stop.z - previous.z);
    previous = stop;
  }
  return total;
}

function finder(boxes) {
  return createPathfinder({ boxes, bounds: BOUNDS, radius: RADIUS });
}

const last = (path) => path[path.length - 1];

test("open ground is a straight line to the click", () => {
  const path = finder([]).findPath({ x: 20, z: 20 }, { x: 150, z: 90 });
  assert.deepEqual(path, [{ x: 150, z: 90 }]);
});

test("a box in the way gets walked around", () => {
  const wall = box(100, 60, 100, 140);
  const from = { x: 50, z: 100 };
  const path = finder([wall]).findPath(from, { x: 150, z: 100 });

  assert.ok(path.length > 1, "should need a corner");
  assert.deepEqual(last(path), { x: 150, z: 100 });
  assertWalkable(path, from, [wall]);
});

test("it goes around the shorter side of a box", () => {
  const wall = box(100, 80, 100, 180);
  const from = { x: 50, z: 100 };
  const path = finder([wall]).findPath(from, { x: 150, z: 100 });

  assert.ok(path[0].z < 80, "the end at z=80 is the much closer way round");
});

test("the route around is the true shortest length", () => {
  const wall = box(100, 60, 100, 140);
  const from = { x: 50, z: 100 };
  const path = finder([wall]).findPath(from, { x: 150, z: 100 });

  // In to the wall's near corner, across its end, and out from its far corner. The corners
  // sit 3.5 of thickness + 5.25 of clearance either side, and 5.25 past the end at z=60.
  const offset = 3.5 + 5.25;
  const expected = 2 * Math.hypot(50 - offset, 40 + 5.25) + 2 * offset;
  assert.ok(Math.abs(pathLength(path, from) - expected) < 0.01);
});

test("a tilted box gets walked around", () => {
  const wall = box(70, 60, 130, 140);
  const from = { x: 60, z: 130 };
  const path = finder([wall]).findPath(from, { x: 140, z: 70 });

  assert.deepEqual(last(path), { x: 140, z: 70 });
  assertWalkable(path, from, [wall]);
});

test("clicking on a box stops just beside it", () => {
  const bench = box(90, 100, 110, 100);
  const from = { x: 100, z: 50 };
  const path = finder([bench]).findPath(from, { x: 100, z: 101 });

  assertWalkable(path, from, [bench]);
  assert.ok(distanceToBox(bench, last(path).x, last(path).z) < RADIUS + 2);
});

test("clicking on a box stops on the side you came from", () => {
  const bench = box(90, 100, 110, 100);
  const from = { x: 100, z: 50 };
  // Just past the bench's middle, so the far side is the closest way out of it
  const path = finder([bench]).findPath(from, { x: 100, z: 101 });

  assert.ok(last(path).z < 100);
  assert.equal(path.length, 1, "no need to walk around it");
});

test("a gap only just wider than the character is walkable", () => {
  // 10.5 between the two faces, for a character 10 across
  const left = box(100, 50, 100, 150);
  const right = box(117.5, 50, 117.5, 150);
  const from = { x: 108.75, z: 100 };
  const path = finder([left, right]).findPath(from, { x: 108.75, z: 30 });

  assert.deepEqual(last(path), { x: 108.75, z: 30 });
  assertWalkable(path, from, [left, right]);
});

test("clicking past the edge of the map stops at the edge", () => {
  const path = finder([]).findPath({ x: 50, z: 50 }, { x: 500, z: 50 });

  assert.ok(last(path).x <= BOUNDS.maxX - RADIUS);
  assert.ok(last(path).x > BOUNDS.maxX - RADIUS - 2);
  assert.equal(last(path).z, 50);
});

// Four boxes closing off a space, like the rocks around the pond
const RING = [
  box(80, 80, 120, 80),
  box(120, 80, 120, 120),
  box(120, 120, 80, 120),
  box(80, 120, 80, 80),
];

test("somewhere walled off gets as close as it can from outside", () => {
  const from = { x: 30, z: 100 };
  const path = finder(RING).findPath(from, { x: 100, z: 100 });

  assertWalkable(path, from, RING);
  const end = last(path);
  const outside = end.x < 80 || end.x > 120 || end.z < 80 || end.z > 120;
  assert.ok(outside, "should end outside the ring");
  assert.ok(Math.hypot(end.x - 100, end.z - 100) < 45, "should end right by the ring");
});

test("a character already touching a box can still set off", () => {
  const wall = box(100, 60, 100, 140);
  // Exactly as close as the collision allows, which is where wall sliding leaves it
  const from = { x: 100 - 3.5 - RADIUS - 0.01, z: 100 };
  const path = finder([wall]).findPath(from, { x: 150, z: 100 });

  assert.deepEqual(last(path), { x: 150, z: 100 });
  assertWalkable(path, from, [wall]);
});

test("walking along a wall it's touching is still a straight line", () => {
  const wall = box(100, 60, 100, 140);
  const from = { x: 100 - 3.5 - RADIUS - 0.01, z: 100 };
  const path = finder([wall]).findPath(from, { x: from.x, z: 120 });

  assert.ok(path.length <= 2, "should not detour");
  assertWalkable(path, from, [wall]);
});
