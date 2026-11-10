import assert from "node:assert/strict";
import { test } from "node:test";
import * as gomoku from "../src/BenchGames/gomoku.js";
import * as dots from "../src/BenchGames/dots.js";
import * as checkers from "../src/BenchGames/checkers.js";
import * as sea from "../src/BenchGames/seaBattle.js";
import { readPlayData } from "../src/BenchGames/protocol.js";
import { seededRandom } from "../src/BenchGames/random.js";

const at = (column, row) => row * gomoku.SIZE + column;

test("five in a row: five or more wins, four doesn't, and points can't be reused", () => {
  let board = gomoku.emptyBoard();
  for (let c = 0; c < 4; c += 1) board = gomoku.place(board, at(c, 6), 0);
  assert.equal(gomoku.findRow(board), null);
  board = gomoku.place(board, at(4, 6), 0);
  assert.deepEqual(gomoku.rowThrough(board, at(2, 6)), [0, 1, 2, 3, 4].map((c) => at(c, 6)));
  assert.equal(gomoku.findRow(board).player, 0);
  assert.equal(gomoku.place(board, at(4, 6), 1), null);
  assert.equal(gomoku.place(board, gomoku.POINTS, 1), null);

  // Filling the gap in a split row makes six, which counts
  let six = gomoku.emptyBoard();
  for (const c of [0, 1, 2, 4, 5]) six = gomoku.place(six, at(c, 0), 1);
  assert.equal(gomoku.findRow(six), null);
  six = gomoku.place(six, at(3, 0), 1);
  assert.equal(gomoku.rowThrough(six, at(3, 0)).length, 6);

  // Both diagonals, and a row doesn't wrap round from one edge to the next
  let rising = gomoku.emptyBoard();
  for (let i = 0; i < 5; i += 1) rising = gomoku.place(rising, at(8 + i, 12 - i), 1);
  assert.equal(gomoku.findRow(rising).player, 1);
  let falling = gomoku.emptyBoard();
  for (let i = 0; i < 5; i += 1) falling = gomoku.place(falling, at(i, i), 0);
  assert.equal(gomoku.findRow(falling).player, 0);
  let wrapped = gomoku.emptyBoard();
  for (const c of [10, 11, 12]) wrapped = gomoku.place(wrapped, at(c, 3), 0);
  for (const c of [0, 1]) wrapped = gomoku.place(wrapped, at(c, 4), 0);
  assert.equal(gomoku.findRow(wrapped), null);
});

test("five in a row: rematches swap who starts and the focus stops at the edges", () => {
  assert.equal(gomoku.turnAfter(0, 0), 0);
  assert.equal(gomoku.turnAfter(0, 1), 1);
  assert.equal(gomoku.stepFocus(0, "ArrowLeft"), 0);
  assert.equal(gomoku.stepFocus(0, "ArrowDown"), gomoku.SIZE);
  assert.equal(gomoku.stepFocus(gomoku.SIZE - 1, "ArrowRight"), gomoku.SIZE - 1);
  assert.equal(gomoku.stepFocus(5, "Enter"), null);
});

test("dots and boxes: closing a box scores it and earns another go", () => {
  let game = dots.newGame(0);
  // Three sides of the top left box, then the fourth
  game = dots.drawLine(game, dots.acrossLine(0, 0), 0);
  assert.equal(game.turn, 1);
  game = dots.drawLine(game, dots.acrossLine(1, 0), 1);
  game = dots.drawLine(game, dots.downLine(0, 0), 0);
  assert.equal(dots.drawLine(game, dots.downLine(0, 1), 0), null, "not their turn");
  game = dots.drawLine(game, dots.downLine(0, 1), 1);
  assert.equal(game.boxes[0], 1);
  assert.equal(game.turn, 1);
  assert.deepEqual(dots.score(game), [0, 1]);
  assert.equal(dots.drawLine(game, dots.acrossLine(0, 0), 1), null, "already drawn");
  assert.equal(dots.newGame(1).turn, 1);
});

test("dots and boxes: one line can close two boxes, and it ends when every line is in", () => {
  const lines = (box) => {
    const row = Math.floor(box / dots.BOXES);
    const column = box % dots.BOXES;
    return [
      dots.acrossLine(row, column),
      dots.acrossLine(row + 1, column),
      dots.downLine(row, column),
    ];
  };
  // The two boxes either side of one down line, with every other side drawn
  let game = dots.newGame(0);
  const sides = [...lines(0), dots.acrossLine(0, 1), dots.acrossLine(1, 1), dots.downLine(0, 2)];
  sides.forEach((line) => {
    game = dots.drawLine(game, line, game.turn);
  });
  const player = game.turn;
  game = dots.drawLine(game, dots.downLine(0, 1), player);
  assert.equal(game.boxes[0], player);
  assert.equal(game.boxes[1], player);

  let full = dots.newGame(0);
  for (let line = 0; line < dots.LINES; line += 1) full = dots.drawLine(full, line, full.turn);
  assert.ok(dots.isOver(full));
  const [a, b] = dots.score(full);
  assert.equal(a + b, dots.BOXES * dots.BOXES);
});

test("dots and boxes: the arrow keys can reach every line", () => {
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const line = queue.shift();
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      const next = dots.stepFocus(line, key);
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  assert.equal(seen.size, dots.LINES);
  assert.equal(dots.stepFocus(0, "ArrowUp"), 0);
});

const sq = (column, row) => row * checkers.SIZE + column;
const piece = (player, king = false) => ({ player, king });
const emptyCheckers = () => Array(checkers.SQUARES).fill(null);

test("checkers: the opening has seven moves and men only go forwards", () => {
  const game = checkers.newGame(0);
  assert.equal(checkers.piecesLeft(game.board, 0), 12);
  assert.equal(checkers.piecesLeft(game.board, 1), 12);
  assert.equal(checkers.legalMoves(game.board, 0).length, 7);
  assert.equal(checkers.turnOf(game), 0);
  assert.equal(checkers.turnOf(checkers.newGame(1)), 1);
  // A man on its own in the middle can go two ways, and a king four
  const board = emptyCheckers();
  board[sq(3, 4)] = piece(0);
  board[sq(6, 1)] = piece(1, true);
  assert.equal(checkers.legalMoves(board, 0).length, 2);
  assert.equal(checkers.legalMoves(board, 1).length, 4);
});

test("checkers: captures are compulsory and chain to the end", () => {
  const board = emptyCheckers();
  board[sq(1, 6)] = piece(0);
  board[sq(2, 5)] = piece(1);
  board[sq(4, 3)] = piece(1);
  board[sq(6, 7)] = piece(0);
  const moves = checkers.legalMoves(board, 0);
  // The step with the other man isn't allowed while there's a capture, and the capture goes on
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].path, [sq(1, 6), sq(3, 4), sq(5, 2)]);
  assert.deepEqual(moves[0].taken, [sq(2, 5), sq(4, 3)]);
  assert.equal(checkers.movesStartingWith(board, 0, [sq(1, 6), sq(3, 4)]).length, 1);

  const game = { board, moves: 0, quiet: 5, first: 0 };
  assert.equal(checkers.play(game, [sq(1, 6), sq(3, 4)]), null, "stopping half way");
  const after = checkers.play(game, moves[0].path);
  assert.equal(after.board[sq(5, 2)].player, 0);
  assert.equal(after.board[sq(2, 5)], null);
  assert.equal(after.quiet, 0);
  assert.deepEqual(checkers.result(after), { winner: 0 });
});

test("checkers: the far row crowns a man and ends its move, and kings go backwards", () => {
  const board = emptyCheckers();
  board[sq(2, 2)] = piece(0);
  board[sq(3, 1)] = piece(1);
  // After crowning on (4, 0) it could jump (5, 1) as a king, but the move has to stop
  board[sq(5, 1)] = piece(1);
  const moves = checkers.legalMoves(board, 0);
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].path, [sq(2, 2), sq(4, 0)]);
  const after = checkers.play({ board, moves: 0, quiet: 0, first: 0 }, moves[0].path);
  assert.ok(after.board[sq(4, 0)].king);

  const kings = emptyCheckers();
  kings[sq(3, 3)] = piece(0, true);
  kings[sq(2, 4)] = piece(1);
  const back = checkers.legalMoves(kings, 0);
  assert.deepEqual(back.map((m) => m.path), [[sq(3, 3), sq(1, 5)]]);
});

test("checkers: no moves loses, and kings shuffling about is a draw", () => {
  const stuck = emptyCheckers();
  stuck[sq(0, 7)] = piece(0);
  stuck[sq(1, 6)] = piece(1);
  stuck[sq(2, 5)] = piece(1);
  assert.deepEqual(checkers.result({ board: stuck, moves: 0, quiet: 0, first: 0 }), { winner: 1 });

  const board = emptyCheckers();
  board[sq(0, 7)] = piece(0, true);
  board[sq(7, 0)] = piece(1, true);
  let game = { board, moves: 0, quiet: checkers.QUIET_LIMIT - 1, first: 0 };
  game = checkers.play(game, [sq(0, 7), sq(1, 6)]);
  assert.deepEqual(checkers.result(game), { winner: null });
  assert.equal(checkers.play(game, [sq(7, 0), sq(6, 1)]), null, "the game is over");
});

test("checkers: the other player sees the board turned round", () => {
  assert.equal(checkers.viewSquare(0, true), 63);
  assert.equal(checkers.viewSquare(checkers.viewSquare(20, true), true), 20);
  assert.equal(checkers.viewSquare(20, false), 20);
  // Turning the board round keeps dark squares dark
  assert.ok(checkers.isDark(checkers.viewSquare(1, true)));
});

const fleet = [
  { start: 0, down: false }, // 0 1 2 3
  { start: 16, down: true }, // 16 24 32
  { start: 7, down: true }, // 7 15 23
  { start: 62, down: false }, // 62 63
  { start: 44, down: false }, // 44 45
];

test("sea battle: ships stay on the grid and off each other", () => {
  assert.ok(sea.isValidFleet(fleet));
  assert.equal(sea.shipCells(6, 4, false), null);
  assert.ok(!sea.fitsAt(fleet, 1, 1, true), "on top of the long ship");
  // Moving near the edge nudges it back on, and turning it into another ship is refused
  assert.deepEqual(sea.moveShip(fleet, 0, 38)[0], { start: 36, down: false });
  assert.equal(sea.moveShip(fleet, 0, 16), null);
  assert.equal(sea.turnShip(fleet, 0), null);
  assert.deepEqual(sea.turnShip(fleet, 3)[3], { start: 54, down: true });
  const random = seededRandom(7);
  for (let i = 0; i < 50; i += 1) assert.ok(sea.isValidFleet(sea.randomFleet(random)));
});

test("sea battle: a fleet survives the trip and must be all there", () => {
  const sent = sea.encodeFleet(fleet);
  assert.deepEqual(sea.decodeFleet(sent), fleet);
  assert.ok(readPlayData({ f: sent }));
  assert.equal(sea.decodeFleet(sent.slice(1)), null);
  assert.equal(sea.decodeFleet([0, 0, 2, 4, 6]), null, "overlapping");
  assert.equal(sea.decodeFleet([0.5, 32, 14, 124, 88]), null);
});

test("sea battle: shots are answered truthfully and the last ship ends it", () => {
  assert.deepEqual(sea.answerShot(fleet, [], 40), { result: "miss", sunk: [] });
  assert.deepEqual(sea.answerShot(fleet, [], 62), { result: "hit", sunk: [] });
  assert.deepEqual(sea.answerShot(fleet, [62], 63), { result: "sunk", sunk: [62, 63] });

  // Every ship cell in turn sinks the lot, and the answers all match the fleet afterwards
  const shots = [];
  for (const cell of sea.fleetCells(fleet).flat()) {
    const answer = sea.answerShot(fleet, shots.map((s) => s.cell), cell);
    assert.ok(sea.plausibleAnswer(shots, cell, answer.result, answer.sunk));
    shots.push({ cell, ...answer });
  }
  assert.ok(sea.allSunk(shots));
  assert.ok(sea.answersMatch(fleet, shots));
  // Claiming a hit was a miss shows up once the fleet is out
  const lie = shots.map((s, i) => (i === 0 ? { ...s, result: "miss" } : s));
  assert.ok(!sea.answersMatch(fleet, lie));
  assert.equal(sea.shooterOf(0, 0), 0);
  assert.equal(sea.shooterOf(0, 1), 1);
});

test("sea battle: answers that can't be true are caught straight away", () => {
  const shots = [{ cell: 62, result: "hit", sunk: [] }];
  assert.ok(sea.plausibleAnswer(shots, 63, "sunk", [62, 63]));
  assert.ok(!sea.plausibleAnswer(shots, 63, "sunk", [63]), "too short");
  assert.ok(!sea.plausibleAnswer(shots, 63, "sunk", [61, 63]), "with a gap");
  assert.ok(sea.plausibleAnswer(shots, 54, "sunk", [54, 62]), "down the grid works too");
  assert.ok(!sea.plausibleAnswer([], 63, "sunk", [62, 63]), "62 was never hit");
  assert.ok(!sea.plausibleAnswer(shots, 63, "boom", []));
  // Only one two-long ship left, so sinking a third isn't possible
  const twoSunk = [
    { cell: 62, result: "sunk", sunk: [62, 63] },
    { cell: 44, result: "hit", sunk: [] },
    { cell: 45, result: "sunk", sunk: [44, 45] },
    { cell: 30, result: "hit", sunk: [] },
  ];
  assert.ok(!sea.plausibleAnswer(twoSunk, 31, "sunk", [30, 31]));
});

test("sea battle: the commitment hides the fleet but pins it down", async () => {
  const salt = sea.newSalt();
  assert.match(salt, /^[0-9a-f]{32}$/);
  const commitment = await sea.commitFleet(fleet, salt);
  assert.ok(sea.isCommitment(commitment) && commitment.length === 32);
  assert.ok(readPlayData({ c: commitment, k: salt }));
  assert.equal(await sea.commitFleet(fleet, salt), commitment);
  const moved = sea.moveShip(fleet, 4, 40);
  assert.notEqual(await sea.commitFleet(moved, salt), commitment);
  assert.equal(await sea.commitFleet(fleet, ""), "");
  assert.equal(await sea.commitFleet(fleet, salt, {}), "");
  assert.ok(sea.isCommitment(""));
  assert.ok(!sea.isCommitment("ABC"));
});
