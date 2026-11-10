import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MAX_PARTS,
  NEIGHBOURS,
  WORDS_PER_PART,
  drawGrid,
  findWords,
  joinParts,
  makeBoard,
  pathWord,
  readResultPart,
  resultParts,
  roundWinner,
  scoreWords,
  sortWords,
  touching,
  tracePath,
  wordPoints,
} from "../src/BenchGames/games/wordHunt/wordHunt.js";
import {
  canMake,
  makeRack,
  shuffleLetters,
  takeLetters,
  wordsFrom,
} from "../src/BenchGames/games/anagrams/anagrams.js";
import { readPlayData } from "../src/BenchGames/protocol.js";
import { seededRandom } from "../src/BenchGames/shared/random.js";

const list = (name) =>
  readFileSync(new URL(`../public/words/${name}`, import.meta.url), "utf8")
    .split("\n")
    .filter((word) => /^[a-z]+$/.test(word));

// c a t s
// o d e r
// g qu u n
// x y z e
const GRID = ["c", "a", "t", "s", "o", "d", "e", "r", "g", "qu", "u", "n", "x", "y", "z", "e"];

test("tiles touch across, up and down and on the diagonals", () => {
  assert.deepEqual(
    [...NEIGHBOURS[0]].sort((a, b) => a - b),
    [1, 4, 5]
  );
  assert.equal(NEIGHBOURS[5].length, 8);
  assert.ok(touching(0, 5));
  assert.ok(!touching(0, 2));
  // The end of one row doesn't wrap round to the start of the next
  assert.ok(!touching(3, 4));
});

test("a word traces through touching tiles without using one twice", () => {
  assert.deepEqual(tracePath(GRID, "cats"), [0, 1, 2, 3]);
  assert.deepEqual(tracePath(GRID, "cod"), [0, 4, 5]);
  assert.equal(pathWord(GRID, tracePath(GRID, "rest")), "rest");
  // c and t don't touch
  assert.equal(tracePath(GRID, "act"), null);
  // Only one t, so it would have to be used twice
  assert.equal(tracePath(GRID, "tat"), null);
  assert.equal(tracePath(GRID, ""), null);
});

test("qu is one tile, and a q can't be used without its u", () => {
  assert.deepEqual(tracePath(GRID, "que"), [9, 6]);
  assert.equal(tracePath(GRID, "qe"), null);
  assert.equal(pathWord(GRID, [9, 6, 5]), "qued");
});

test("finding every word only finds ones that can be traced", () => {
  const words = new Set(["cat", "cats", "cod", "rest", "queue", "act", "tat", "zz", "quiet"]);
  const found = findWords(GRID, words);
  assert.deepEqual([...found].sort(), ["cat", "cats", "cod", "queue", "rest"]);
});

test("grids are fair and the same seed always gives the same one", () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const grid = drawGrid(seededRandom(seed));
    assert.equal(grid.length, 16);
    const vowels = grid.filter((tile) => "aeiou".includes(tile)).length;
    assert.ok(vowels >= 4 && vowels <= 7, `seed ${seed} has ${vowels} vowels`);
    assert.ok(!grid.includes("q"));
  }
  assert.deepEqual(drawGrid(seededRandom(42)), drawGrid(seededRandom(42)));
});

test("a board from the real word list has plenty of words, the same for both players", () => {
  const words = new Set(list("valid.txt"));
  const one = makeBoard(123456, words);
  const two = makeBoard(123456, words);
  assert.deepEqual(one, two);
  assert.ok(one.total >= 60, `only ${one.total} words`);
  for (const word of findWords(one.grid, words)) assert.ok(tracePath(one.grid, word), word);
});

test("longer words score more, and past eight letters it stops going up", () => {
  assert.equal(wordPoints("ab"), 0);
  assert.equal(wordPoints("cat"), 100);
  assert.equal(wordPoints("cats"), 400);
  assert.equal(wordPoints("crate"), 800);
  assert.equal(wordPoints("crates"), 1400);
  assert.equal(wordPoints("caterer"), 1800);
  assert.equal(wordPoints("caterers"), 2200);
  assert.equal(wordPoints("quartered"), 2200);
  assert.equal(scoreWords(["cat", "cats"]), 500);
  assert.equal(scoreWords([]), 0);
});

test("words sort longest first, then A to Z", () => {
  assert.deepEqual(sortWords(["cat", "bat", "cats", "a"]), ["cats", "bat", "cat", "a"]);
});

test("a long list of words goes over in parts that fit a play message", () => {
  // 300 different made up words: "waaa", "waab" and so on
  const letter = (n) => String.fromCharCode(97 + (Math.floor(n) % 26));
  const words = Array.from({ length: 300 }, (_, i) => `w${letter(i / 26)}${letter(i)}`);
  const parts = resultParts(words);
  assert.equal(parts.length, MAX_PARTS);
  assert.ok(parts.every((part) => part.length <= WORDS_PER_PART));
  assert.deepEqual(resultParts([]), [[]]);
  const data = { step: "done", score: 1000, total: 300, part: 0, parts: 4, words: parts[0] };
  assert.deepEqual(readPlayData(data), data);
});

test("their words come back together however the parts arrive, and bad ones are dropped", () => {
  const parts = [["crate", "cat"], ["dog"]];
  const received = new Map();
  const send = (part) => ({ score: 1000, total: 3, part, parts: 2, words: parts[part] });
  received.set(1, readResultPart(send(1)));
  assert.equal(joinParts(received), null);
  received.set(0, readResultPart(send(0)));
  assert.deepEqual(joinParts(received), { score: 1000, total: 3, words: ["crate", "cat", "dog"] });

  assert.equal(readResultPart({ ...send(0), part: 2 }), null);
  assert.equal(readResultPart({ ...send(0), parts: 0 }), null);
  assert.equal(readResultPart({ ...send(0), parts: MAX_PARTS + 1 }), null);
  assert.equal(readResultPart({ ...send(0), score: -5 }), null);
  assert.equal(readResultPart({ ...send(0), score: 1.5 }), null);
  assert.equal(readResultPart({ ...send(0), words: ["ok", "NO"] }), null);
  assert.equal(readResultPart({ ...send(0), words: "cat" }), null);
  assert.equal(readResultPart(undefined), null);
});

test("both work out the same winner, and level scores are a draw", () => {
  assert.equal(roundWinner(500, 400), "host");
  assert.equal(roundWinner(400, 500), "guest");
  assert.equal(roundWinner(400, 400), "draw");
});

test("anagram letters are a shuffle of the word, never the word itself", () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const mixed = shuffleLetters("planet", seededRandom(seed));
    assert.notEqual(mixed.join(""), "planet");
    assert.deepEqual([...mixed].sort(), [..."planet"].sort());
  }
  // With every letter the same there's no other way round, so it just gives up trying
  assert.deepEqual(shuffleLetters("aaa", seededRandom(1)), ["a", "a", "a"]);
});

test("the same seed picks the same anagram word for both players", () => {
  const six = list("six.txt");
  assert.deepEqual(makeRack(777, six), makeRack(777, six));
  const { word, letters } = makeRack(777, six);
  assert.ok(six.includes(word));
  assert.equal(letters.length, 6);
});

test("each letter goes once per word", () => {
  const letters = [..."banana"];
  assert.ok(canMake("nab", letters));
  assert.ok(canMake("banana", letters));
  assert.ok(!canMake("bananas", letters));
  assert.ok(!canMake("bob", letters));
  assert.deepEqual(takeLetters("ana", letters), [1, 2, 3]);
  assert.equal(takeLetters("x", letters), null);
  assert.deepEqual(wordsFrom(letters, new Set(["nab", "ban", "an", "bob", "banana", "nana"])), [
    "nab",
    "ban",
    "banana",
    "nana",
  ]);
});
