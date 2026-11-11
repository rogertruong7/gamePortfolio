import assert from "node:assert/strict";
import { test } from "node:test";
import { seededRandom } from "../src/BenchGames/shared/random.js";
import {
  HEIGHT,
  LOCK_MS,
  PIECES,
  WIDTH,
  cellsOf,
  fallMs,
  fits,
  hardDrop,
  hold,
  landing,
  levelOf,
  newGame as newBlocks,
  rotate,
  shift,
  spawn,
  tick,
} from "../src/Arcade/games/blockDrop/blockDrop.js";
import {
  GOAL,
  SIZE,
  canMove,
  newGame as newDoubles,
  slide,
} from "../src/Arcade/games/doubles/doubles.js";
import {
  CROW_HEIGHTS,
  FOX_X,
  foxBox,
  hits,
  newGame as newRun,
  scoreOf,
  step,
} from "../src/Arcade/games/foxRun/foxRun.js";
import { readBest, saveBest } from "../src/Arcade/best.js";

const always = (value) => () => value;

// --- Block Drop ---

test("four turns bring every piece back to where it started", () => {
  for (const type of PIECES) {
    assert.deepEqual(cellsOf(type, 4), cellsOf(type, 0));
    assert.equal(new Set(cellsOf(type, 1).map(String)).size, 4);
  }
});

test("the first seven pieces are one of each", () => {
  const game = newBlocks(seededRandom(7));
  const seven = [game.piece.type, ...game.queue.slice(0, 6)];
  assert.deepEqual([...seven].sort(), [...PIECES].sort());
});

test("pieces stop at the walls", () => {
  let game = newBlocks(seededRandom(1));
  for (let i = 0; i < 20; i += 1) game = shift(game, -1);
  const left = Math.min(...cellsOf(game.piece.type, game.piece.rot).map(([x]) => x + game.piece.x));
  assert.equal(left, 0);
});

test("a hard drop lands on the floor and scores two a row", () => {
  const game = newBlocks(seededRandom(2));
  const landed = landing(game);
  const dropped = hardDrop(game, seededRandom(3));
  assert.equal(dropped.score, (landed.y - game.piece.y) * 2);
  assert.equal(dropped.board.filter(Boolean).length, 4);
  assert.notEqual(dropped.piece, game.piece);
});

test("a full row clears and scores by level", () => {
  const random = seededRandom(4);
  const game = newBlocks(random);
  const board = new Array(WIDTH * HEIGHT).fill(null);
  // The bottom row full but for the four squares on the right, where a flat I lands
  for (let x = 0; x < WIDTH - 4; x += 1) board[(HEIGHT - 1) * WIDTH + x] = "O";
  const piece = { ...spawn("I"), x: WIDTH - 4 };
  const dropped = hardDrop({ ...game, board, piece, score: 0 }, random);
  assert.equal(dropped.lines, 1);
  assert.deepEqual(dropped.cleared, [HEIGHT - 1]);
  assert.equal(dropped.board.filter(Boolean).length, 0);
  assert.equal(dropped.score, 100 + (HEIGHT - 1) * 2);
});

test("a turn against the wall kicks the piece in", () => {
  const game = newBlocks(seededRandom(5));
  const piece = { type: "I", rot: 1, x: -2, y: 5 };
  assert.ok(fits(game.board, piece));
  const turned = rotate({ ...game, piece }, 1);
  assert.equal(turned.piece.rot, 2);
  assert.ok(fits(turned.board, turned.piece));
});

test("holding swaps once per piece", () => {
  const random = seededRandom(6);
  const game = newBlocks(random);
  const first = game.piece.type;
  const held = hold(game, random);
  assert.equal(held.hold, first);
  assert.equal(held.piece.type, game.queue[0]);
  assert.equal(hold(held, random), held);
});

test("a resting piece locks after the lock time", () => {
  const random = seededRandom(8);
  let game = newBlocks(random);
  game = { ...game, piece: landing(game) };
  const before = tick(game, LOCK_MS - 10, false, random);
  assert.equal(before.board.filter(Boolean).length, 0);
  const after = tick(before, 20, false, random);
  assert.equal(after.board.filter(Boolean).length, 4);
});

test("gravity speeds up with the level", () => {
  assert.equal(levelOf(0), 1);
  assert.equal(levelOf(10), 2);
  assert.ok(fallMs(5) < fallMs(1));
  assert.equal(fallMs(100), 50);
});

test("it's over when the next piece has no room", () => {
  const random = seededRandom(9);
  const game = newBlocks(random);
  const board = new Array(WIDTH * HEIGHT).fill("O");
  assert.equal(hold({ ...game, board }, random).over, true);
});

// --- Doubles ---

const withTiles = (values) => {
  const tiles = [];
  values.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value) tiles.push({ id: tiles.length + 1, value, row: r, col: c });
    })
  );
  return { tiles, gone: [], nextId: tiles.length + 1, score: 0, moves: 0, won: false, over: false };
};

test("a new game has two tiles", () => {
  const game = newDoubles(seededRandom(1));
  assert.equal(game.tiles.length, 2);
  assert.ok(game.tiles.every((tile) => tile.value === 2 || tile.value === 4));
});

test("tiles slide and pairs join once each", () => {
  const game = withTiles([
    [2, 2, 2, 2],
    [4, 0, 4, 8],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const next = slide(game, "left", always(0.99));
  const row = (r) =>
    [0, 1, 2, 3].map((c) => next.tiles.find((t) => t.row === r && t.col === c)?.value ?? 0);
  assert.deepEqual(row(0), [4, 4, 0, 0]);
  assert.deepEqual(row(1), [8, 8, 0, 0]);
  assert.equal(next.score, 16);
  assert.equal(next.gone.length, 3);
  assert.equal(next.tiles.length, 5);
});

test("a move that changes nothing adds no tile", () => {
  const game = withTiles([
    [2, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  assert.equal(slide(game, "left", Math.random), game);
  assert.equal(slide(game, "up", Math.random), game);
});

test("making the goal wins, and a stuck board is over", () => {
  const half = GOAL / 2;
  const won = slide(
    withTiles([
      [half, half, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]),
    "right",
    always(0)
  );
  assert.equal(won.won, true);

  const stuck = withTiles([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);
  assert.equal(canMove(stuck), false);
  assert.equal(stuck.tiles.length, SIZE * SIZE);
});

// --- Fox Run ---

test("the fox jumps on a press and comes back down", () => {
  const random = seededRandom(3);
  let game = newRun(random);
  game = step(game, { jump: true, duck: false }, random);
  assert.ok(game.y > 0);
  let highest = 0;
  for (let i = 0; i < 240; i += 1) {
    game = step(game, { jump: true, duck: false }, random);
    highest = Math.max(highest, game.y);
  }
  assert.ok(highest > 100);
  assert.equal(game.y, 0);
  // Still held down, so no second jump
  assert.equal(step(game, { jump: true, duck: false }, random).y, 0);
});

test("ducking passes under a middle crow but not a low one", () => {
  const game = { ...newRun(always(0.5)), ducking: true };
  const crow = (bottom) => ({ kind: "crow", x: FOX_X, width: 38, height: 22, bottom });
  assert.equal(hits(foxBox(game), crow(CROW_HEIGHTS[1])), false);
  assert.equal(hits(foxBox(game), crow(CROW_HEIGHTS[0])), true);
  assert.equal(hits(foxBox({ ...game, ducking: false }), crow(CROW_HEIGHTS[1])), true);
  assert.equal(hits(foxBox({ ...game, ducking: false }), crow(CROW_HEIGHTS[2])), false);
});

test("running into a rock ends the run, and the score counts distance", () => {
  const random = seededRandom(4);
  let game = newRun(random);
  let steps = 0;
  while (!game.over && steps < 60 * 120) {
    game = step(game, { jump: false, duck: false }, random);
    steps += 1;
  }
  assert.equal(game.over, true);
  assert.ok(scoreOf(game) > 0);
  assert.equal(step(game, { jump: true, duck: false }, random), game);
});

// --- Best scores ---

test("only a better score is kept", () => {
  saveBest("testgame", 50);
  assert.equal(saveBest("testgame", 20), false);
  assert.equal(readBest("testgame"), 50);
  assert.equal(saveBest("testgame", 80), true);
  assert.equal(readBest("testgame"), 80);
  assert.equal(readBest("nothing"), 0);
});
