import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlocked, moveAndSlide } from "../src/Game/movement/wallSliding.js";

const RADIUS = 5;
const SPEED = 100;

// The same shape as RotatedBox in Static.jsx, which needs three.js to import
function box(x1, z1, x2, z2, thickness = 7) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const angle = Math.atan2(dz, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  const halfW = Math.hypot(dx, dz) / 2;
  const halfD = thickness / 2;
  return {
    closestPoint({ x, z }) {
      const u = (x - cx) * cos + (z - cz) * sin;
      const v = -(x - cx) * sin + (z - cz) * cos;
      const clampedU = Math.max(-halfW, Math.min(u, halfW));
      const clampedV = Math.max(-halfD, Math.min(v, halfD));
      return {
        x: cx + clampedU * cos - clampedV * sin,
        z: cz + clampedU * sin + clampedV * cos,
      };
    },
  };
}

function gap(wall, position) {
  const closest = wall.closestPoint(position);
  return Math.hypot(position.x - closest.x, position.z - closest.z);
}

// The first bench in Static.jsx
const FACING = [0.735, -0.678];
const SEAT = [123.05, -46];
const ALONG = [-FACING[1], FACING[0]];
const BENCH = box(
  SEAT[0] - ALONG[0] * 11.2,
  SEAT[1] - ALONG[1] * 11.2,
  SEAT[0] + ALONG[0] * 11.2,
  SEAT[1] + ALONG[1] * 11.2
);

function benchSpot(along, out) {
  return {
    x: SEAT[0] + ALONG[0] * along + FACING[0] * out,
    y: -8,
    z: SEAT[1] + ALONG[1] * along + FACING[1] * out,
  };
}

const FRAME_RATES = [144, 60, 30, 20, 5];

test("walking at the end of a bench never gets into it, at any frame rate", () => {
  for (const fps of FRAME_RATES) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 24) {
      for (let out = -14; out <= 14; out += 2) {
        for (const end of [-1, 1]) {
          const position = benchSpot(end * 25, out);
          for (let frame = 0; frame < fps * 2; frame += 1) {
            const step = SPEED / fps;
            moveAndSlide(
              position,
              Math.cos(angle) * step,
              Math.sin(angle) * step,
              [BENCH],
              RADIUS
            );
            assert.ok(gap(BENCH, position) > RADIUS - 1e-3, `in the bench at ${fps}fps`);
          }
        }
      }
    }
  }
});

test("spinning around against a bench never gets into it", () => {
  for (const fps of FRAME_RATES) {
    for (const turnsPerSecond of [0.5, 1, 3, 8, -3]) {
      for (const [along, out] of [[17, 0], [-17, 0], [0, 9], [0, -9], [17, 9], [-17, -9]]) {
        const position = benchSpot(along, out);
        for (let frame = 0; frame < fps * 6; frame += 1) {
          const angle = (frame / fps) * turnsPerSecond * Math.PI * 2;
          const step = SPEED / fps;
          moveAndSlide(
            position,
            Math.cos(angle) * step,
            Math.sin(angle) * step,
            [BENCH],
            RADIUS
          );
          assert.ok(gap(BENCH, position) > RADIUS - 1e-3, `in the bench at ${fps}fps`);
        }
      }
    }
  }
});

test("a huge frame can't jump through a bench", () => {
  const position = benchSpot(0, 20);
  moveAndSlide(position, -FACING[0] * 1000, -FACING[1] * 1000, [BENCH], RADIUS);
  const out = (position.x - SEAT[0]) * FACING[0] + (position.z - SEAT[1]) * FACING[1];
  assert.ok(out > 0 || gap(BENCH, position) > RADIUS - 1e-3);
  assert.ok(gap(BENCH, position) > RADIUS - 1e-3);
});

test("walking at a wall at an angle slides along it at full speed", () => {
  const wall = box(100, 0, 100, 400);
  const position = { x: 100 - 3.5 - RADIUS - 0.01, y: 0, z: 100 };
  moveAndSlide(position, Math.SQRT1_2 * 10, Math.SQRT1_2 * 10, [wall], RADIUS);

  assert.ok(Math.abs(position.z - 110) < 0.1, `only reached z=${position.z}`);
  assert.ok(gap(wall, position) > RADIUS - 1e-3);
});

test("walking straight into a wall just stops", () => {
  const wall = box(100, 0, 100, 400);
  const position = { x: 100 - 3.5 - RADIUS - 0.01, y: 0, z: 100 };
  moveAndSlide(position, 10, 0, [wall], RADIUS);

  assert.equal(position.z, 100);
  assert.ok(gap(wall, position) > RADIUS - 1e-3);
});

test("sliding stops in the corner where two walls meet", () => {
  const walls = [box(100, 0, 100, 100), box(100, 100, 0, 100)];
  const position = { x: 50, y: 0, z: 50 };
  for (let frame = 0; frame < 120; frame += 1) {
    moveAndSlide(position, 1.2, 1.2, walls, RADIUS);
  }
  for (const wall of walls) assert.ok(gap(wall, position) > RADIUS - 1e-3);
  assert.ok(position.x > 90 && position.z > 90, "should end up in the corner");
});

test("a character already inside a wall can walk back out", () => {
  const position = { x: 100 - 3.5 - 2, y: 0, z: 100 };
  const wall = box(100, 0, 100, 400);
  moveAndSlide(position, -10, 0, [wall], RADIUS);

  assert.ok(gap(wall, position) > RADIUS);
});

test("a character inside a wall can't go deeper", () => {
  const wall = box(100, 0, 100, 400);
  const from = { x: 100 - 3.5 - 2, y: 0, z: 100 };
  assert.equal(isBlocked(from, { x: from.x + 1, y: 0, z: 100 }, [wall], RADIUS), true);
});
