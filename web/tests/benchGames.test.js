import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COLUMNS,
  ROWS,
  canDrop,
  drop,
  emptyBoard,
  findLine,
  isFull,
  turnAfter,
} from "../src/BenchGames/games/connectFour/connectFourBoard.js";
import { compare, matchOver, tally } from "../src/BenchGames/games/scissorsPaperRock/rps.js";
import { cantWin, pickWord, roundWinner, typedIt } from "../src/BenchGames/games/typeRace/typing.js";
import { WORDS } from "../src/BenchGames/games/typeRace/words.js";
import {
  keepsOwnInvite,
  readGameMessage,
  writeGameMessage,
} from "../src/BenchGames/protocol.js";

const play = (columns) =>
  columns.reduce((board, column, i) => drop(board, column, i % 2), emptyBoard());

test("discs stack up a column until it's full", () => {
  let board = emptyBoard();
  for (let i = 0; i < ROWS; i += 1) board = drop(board, 3, i % 2);
  assert.equal(board[3].length, ROWS);
  assert.ok(!canDrop(board, 3));
  assert.equal(drop(board, 3, 0), null);
  assert.equal(drop(board, COLUMNS, 0), null);
  assert.equal(drop(board, -1, 0), null);
});

test("four in a row wins across, up and on both diagonals", () => {
  // Player 0 plays 0, 1, 2, 3 along the bottom while player 1 stacks on top
  assert.equal(findLine(play([0, 0, 1, 1, 2, 2, 3])).player, 0);
  // Player 0 goes straight up column 0
  assert.equal(findLine(play([0, 1, 0, 1, 0, 1, 0])).player, 0);
  // A rising diagonal for player 0 from column 0 to column 3
  const rising = play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
  assert.equal(findLine(rising).player, 0);
  assert.equal(findLine(rising).cells.length, 4);
  // A falling diagonal for player 0 from column 3 down to column 6
  const falling = play([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]);
  assert.equal(findLine(falling).player, 0);
  assert.equal(findLine(play([0, 1, 2])), null);
});

test("a full board with no line is a draw", () => {
  // Rows alternate colour, and each pair of columns starts on the other colour
  const board = Array.from({ length: COLUMNS }, (_, column) =>
    Array.from({ length: ROWS }, (_, row) => (row + Math.floor(column / 2)) % 2)
  );
  assert.ok(isFull(board));
  assert.equal(findLine(board), null);
  assert.ok(!isFull(play([0])));
});

test("the inviter starts the first game and the rematch swaps who starts", () => {
  assert.equal(turnAfter(0, 0), 0);
  assert.equal(turnAfter(1, 0), 1);
  assert.equal(turnAfter(0, 1), 1);
});

test("scissors paper rock goes the right way round", () => {
  assert.equal(compare("scissors", "paper"), 1);
  assert.equal(compare("paper", "rock"), 1);
  assert.equal(compare("rock", "scissors"), 1);
  assert.equal(compare("rock", "paper"), -1);
  assert.equal(compare("rock", "rock"), 0);
});

test("first to three wins, and draws don't count", () => {
  const rounds = [
    { me: "rock", them: "scissors" },
    { me: "rock", them: "rock" },
    { me: "paper", them: "rock" },
    { me: "paper", them: "scissors" },
  ];
  assert.deepEqual(tally(rounds), [2, 1]);
  assert.ok(!matchOver(tally(rounds)));
  assert.ok(matchOver(tally([...rounds, { me: "scissors", them: "paper" }])));
});

test("the faster time wins the round, and a dead heat goes to the inviter", () => {
  assert.equal(roundWinner(1200, 1500), "host");
  assert.equal(roundWinner(1500, 1200), "guest");
  assert.equal(roundWinner(1300, 1300), "host");
  assert.equal(roundWinner(null, 2000), "guest");
  assert.equal(roundWinner(2000, null), "host");
  assert.equal(roundWinner(1000, undefined), null);
});

test("someone slower than a time already in gives up", () => {
  assert.ok(cantWin(1600, 1500));
  assert.ok(!cantWin(1400, 1500));
  assert.ok(!cantWin(5000, undefined));
});

test("typing the word ignores case and spaces at the ends", () => {
  assert.ok(typedIt("  Lantern ", "lantern"));
  assert.ok(!typedIt("lanter", "lantern"));
});

test("words aren't repeated in a match while there are fresh ones", () => {
  const used = WORDS.slice(1);
  assert.equal(pickWord(used, () => 0.5), WORDS[0]);
  assert.ok(WORDS.includes(pickWord(WORDS, () => 0.99)));
  assert.ok(WORDS.every((word) => /^[a-z]+$/.test(word)));
});

test("game messages survive the trip and junk is thrown away", () => {
  const base = { id: "a", to: "b", session: "s1", match: 2 };
  const drop1 = readGameMessage(writeGameMessage({ ...base, kind: "drop", move: 4, column: 3 }));
  assert.deepEqual(drop1, { ...base, kind: "drop", move: 4, column: 3 });
  const gaveUp = readGameMessage(writeGameMessage({ ...base, kind: "typed", round: 1, time: null }));
  assert.equal(gaveUp.time, null);
  const invite = readGameMessage(writeGameMessage({ ...base, kind: "invite", game: "rps" }));
  assert.equal(invite.game, "rps");

  assert.equal(readGameMessage({ id: "a", to: "b", s: "s1", k: "invite", g: "chess" }), null);
  assert.equal(readGameMessage({ id: "a", to: "b", s: "s1", k: "explode" }), null);
  assert.equal(readGameMessage({ id: "a", to: "b", s: "s1", k: "drop", n: -1, c: 2 }), null);
  assert.equal(readGameMessage({ id: "a", to: "b", s: "s1", k: "throw", r: 0, p: "lizard" }), null);
  assert.equal(readGameMessage({ id: "a", to: "b", s: "s1", k: "word", r: 0, w: "<b>hi" }), null);
  assert.equal(readGameMessage({ id: "a", to: "b", s: "", k: "accept" }), null);
  assert.equal(readGameMessage(null), null);
});

test("when both invite at once, exactly one invite is kept", () => {
  assert.notEqual(keepsOwnInvite("a", "b"), keepsOwnInvite("b", "a"));
});

test("play messages carry flat game data and anything odd is thrown away", async () => {
  const { readPlayData } = await import("../src/BenchGames/protocol.js");
  const base = { id: "a", to: "b", session: "s1", match: 0 };
  const data = { turn: 3, cells: [1, 2, 3], word: "lantern", words: ["cat", "dog"] };
  const read = readGameMessage(writeGameMessage({ ...base, kind: "play", data }));
  assert.deepEqual(read.data, data);

  assert.equal(readPlayData(null), null);
  assert.equal(readPlayData([1, 2]), null);
  assert.equal(readPlayData({ nested: { a: 1 } }), null);
  assert.equal(readPlayData({ Bad: 1 }), null);
  assert.equal(readPlayData({ word: "<script>" }), null);
  assert.equal(readPlayData({ x: Infinity }), null);
  assert.equal(readPlayData({ x: 1e7 }), null);
  assert.equal(readPlayData({ list: Array(65).fill(0) }), null);
  assert.equal(readPlayData({ list: [[1]] }), null);
  const many = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [`k${i}`, i]));
  assert.equal(readPlayData(many), null);
  assert.equal(readGameMessage({ id: "a", to: "b", s: "s1", k: "play", d: { a: {} } }), null);
});

test("the same seed gives the same numbers on both screens", async () => {
  const { seededRandom, newSeed } = await import("../src/BenchGames/shared/random.js");
  const a = seededRandom(1234);
  const b = seededRandom(1234);
  const first = Array.from({ length: 5 }, a);
  assert.deepEqual(first, Array.from({ length: 5 }, b));
  assert.ok(first.every((n) => n >= 0 && n < 1));
  assert.notDeepEqual(first, Array.from({ length: 5 }, seededRandom(1235)));
  const seed = newSeed();
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 1e6);
});

test("every game in the picker has a screen", async () => {
  const { GAMES } = await import("../src/BenchGames/protocol.js");
  const ids = GAMES.map((game) => game.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z0-9]+$/.test(id)));
  assert.equal(ids.length, 15);
});
