import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BALLS,
  OFF,
  RADIUS,
  aimAt,
  collideBalls,
  createWorld,
  rack,
  roundPos,
  simulate,
} from "../src/BenchGames/poolPhysics.js";
import {
  applyShot,
  canPlaceCue,
  newGame,
  readShot,
  shotData,
  startPos,
} from "../src/BenchGames/poolRules.js";
import { readPlayData } from "../src/BenchGames/protocol.js";

// A table with only the given balls on it, as { id: [x, y] }
const table = (balls) => {
  const pos = new Array(BALLS * 2).fill(OFF);
  for (const [id, [x, y]] of Object.entries(balls)) {
    pos[id * 2] = x;
    pos[id * 2 + 1] = y;
  }
  return pos;
};

// A game partway through, and a shot result to feed applyShot
const game = (fields) => ({ ...newGame(0), shots: 5, inHand: null, ...fields });
const shot = (sunk, first, pos = rack()) => ({
  angle: 0,
  power: 0.5,
  cue: { x: 0, y: 0 },
  pos,
  sunk,
  first,
});

test("a struck ball slows down and stops on the table", () => {
  const result = simulate(table({ 0: [40, 50] }), 0, 0.15, { frames: true });
  const [x, y] = result.pos;
  assert.ok(x > 60 && x < 197 && y === 50);
  assert.ok(result.frames.length > 10 && result.frames.length < 60 * 60);
  assert.deepEqual(result.sunk, []);
  assert.equal(result.first, -1);
});

test("a straight shot pots the ball in the corner and in the side", () => {
  const corner = simulate(table({ 0: [60, 60], 1: [30, 30] }), Math.atan2(-1, -1), 0.5);
  assert.deepEqual(corner.sunk, [1]);
  assert.equal(corner.first, 1);
  assert.equal(corner.pos[2], OFF);
  const side = simulate(table({ 0: [100, 70], 2: [100, 40] }), -Math.PI / 2, 0.4);
  assert.deepEqual(side.sunk, [2]);
});

test("a full-power shot can't pass through a ball or a cushion", () => {
  const through = simulate(table({ 0: [20, 50], 5: [26.5, 50] }), 0, 1);
  assert.equal(through.first, 5);
  for (let k = 0; k < 40; k += 1) {
    const result = simulate(rack(), (k / 40) * Math.PI * 2, 1);
    for (let i = 0; i < BALLS; i += 1) {
      const x = result.pos[i * 2];
      const y = result.pos[i * 2 + 1];
      if (x === OFF) continue;
      assert.ok(x >= 0 && x <= 200 && y >= 0 && y <= 100, `ball ${i} left the table`);
    }
  }
});

test("balls bouncing off each other keep their momentum and don't gain energy", () => {
  const world = createWorld(table({ 0: [50, 50], 3: [50 + 2 * RADIUS - 0.6, 51.5] }));
  world.vx[0] = 200;
  world.vy[0] = 20;
  world.vx[3] = -30;
  const before = { x: 170, y: 20, energy: 200 ** 2 + 20 ** 2 + 30 ** 2 };
  collideBalls(world, 0, 3);
  assert.ok(Math.abs(world.vx[0] + world.vx[3] - before.x) < 1e-9);
  assert.ok(Math.abs(world.vy[0] + world.vy[3] - before.y) < 1e-9);
  const energy = world.vx[0] ** 2 + world.vy[0] ** 2 + world.vx[3] ** 2 + world.vy[3] ** 2;
  assert.ok(energy <= before.energy && energy > before.energy * 0.9);
  assert.equal(world.first, 3);
});

test("the same shot always plays out the same", () => {
  const a = simulate(rack(), 0.01, 1);
  const b = simulate(rack(), 0.01, 1);
  assert.deepEqual(a, b);
});

test("the aim line stops at the first ball in the way", () => {
  const aim = aimAt(table({ 0: [50, 50], 4: [100, 50], 6: [150, 50] }), 0);
  assert.equal(aim.hit, 4);
  assert.ok(Math.abs(aim.x - (100 - 2 * RADIUS)) < 1e-9);
  assert.equal(aimAt(table({ 0: [50, 50] }), Math.PI).hit, -1);
});

test("the inviter breaks first, from behind the line, and the rematch swaps", () => {
  assert.equal(newGame(0).turn, 0);
  assert.equal(newGame(1).turn, 1);
  const start = newGame(0);
  assert.ok(canPlaceCue(start, 40, 50));
  assert.ok(!canPlaceCue(start, 120, 50));
  assert.ok(!canPlaceCue(start, 1, 50));
});

test("a shot's data passes the protocol, survives rounding and stale shots are ignored", () => {
  const start = newGame(0);
  const cue = { x: 50, y: 50 };
  const result = simulate(startPos(start, cue), 0, 1);
  const data = shotData(start, cue, 0, 1, { ...result, pos: roundPos(result.pos) });
  assert.deepEqual(readPlayData(data), data);
  const read = readShot(data, start);
  assert.ok(read);
  const next = applyShot(start, read);
  assert.equal(next.shots, 1);
  assert.equal(readShot(data, next), null);
  assert.equal(readShot({ ...data, pos: [1, 2] }, start), null);
  assert.equal(readShot({ ...data, power: 2 }, start), null);
});

test("potting on the break keeps the turn but leaves the table open", () => {
  const after = applyShot(newGame(0), shot([3], 1));
  assert.equal(after.turn, 0);
  assert.equal(after.solids, null);
  assert.deepEqual(after.sunk, [3]);
  assert.equal(after.pos[6], OFF);
});

test("the first clean pot on an open table picks the groups", () => {
  const after = applyShot(game({ turn: 1 }), shot([12], 12));
  assert.equal(after.solids, 0);
  assert.equal(after.turn, 1);
  assert.ok(after.last.assigned);
  const missed = applyShot(game({ turn: 1 }), shot([], 12));
  assert.equal(missed.turn, 0);
  assert.equal(missed.solids, null);
});

test("fouls hand over ball in hand anywhere", () => {
  const scratch = applyShot(game({ solids: 0 }), shot([2, 0], 2));
  assert.equal(scratch.last.foul, "scratch");
  assert.equal(scratch.turn, 1);
  assert.equal(scratch.inHand, "table");
  assert.notEqual(scratch.pos[0], OFF);

  const miss = applyShot(game({ solids: 0 }), shot([], -1));
  assert.equal(miss.last.foul, "miss");
  assert.equal(miss.turn, 1);

  // Hitting a stripe first is a foul for solids, even if a solid drops after
  const wrong = applyShot(game({ solids: 0 }), shot([2], 9));
  assert.equal(wrong.last.foul, "wrong");
  assert.equal(wrong.turn, 1);
  assert.equal(wrong.inHand, "table");

  const clean = applyShot(game({ solids: 0, inHand: "table" }), shot([], 2));
  assert.equal(clean.last.foul, null);
  assert.equal(clean.inHand, null);
});

test("the black early loses, and the black after clearing wins unless the white follows it", () => {
  const early = applyShot(game({ solids: 0 }), shot([8], 1));
  assert.equal(early.winner, 1);

  const cleared = { solids: 0, sunk: [1, 2, 3, 4, 5, 6, 7] };
  assert.equal(applyShot(game(cleared), shot([8], 8)).winner, 0);
  assert.equal(applyShot(game(cleared), shot([8, 0], 8)).winner, 1);
  // Once cleared, hitting anything but the black first is a foul, and potting it then loses
  assert.equal(applyShot(game(cleared), shot([8], 9)).winner, 1);
  // Potting the last of the group along with the black is still too early
  const lastOne = { solids: 0, sunk: [1, 2, 3, 4, 5, 6] };
  assert.equal(applyShot(game(lastOne), shot([7, 8], 7)).winner, 1);
});

test("the black down on the break comes back up", () => {
  const pos = roundPos(table({ 0: [100, 50], 1: [150, 50] }));
  const after = applyShot(newGame(0), shot([8], 1, pos));
  assert.equal(after.winner, null);
  assert.ok(after.last.respotted);
  assert.notEqual(after.pos[16], OFF);
  assert.equal(after.turn, 0);
});
