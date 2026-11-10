import { seededRandom } from "../../shared/random.js";

// Word Hunt: a 4 by 4 grid of letters, where words are made by going from tile to touching tile.
// Also the scoring and the end of round swap of words, which Anagrams shares.

export const SIZE = 4;
export const TILES = SIZE * SIZE;
export const MIN_LETTERS = 3;

// How often each tile comes up, roughly as often as the letter turns up in English words. Q only
// ever comes as "qu", since a Q on its own is next to useless.
// prettier-ignore
const WEIGHTS = {
  e: 24, a: 18, i: 16, o: 16, t: 14, n: 14, s: 14, r: 14, l: 10, d: 8, u: 8, c: 6, h: 6, m: 6,
  p: 6, g: 6, b: 4, y: 4, f: 4, w: 4, k: 4, v: 2, qu: 2, x: 1, j: 1, z: 1,
};
const BAG = Object.entries(WEIGHTS);
const BAG_TOTAL = BAG.reduce((sum, [, weight]) => sum + weight, 0);
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// A grid this short of words gets thrown back and another one drawn
const ENOUGH_WORDS = 60;
const GRID_TRIES = 20;

// Each tile's touching tiles, across, up and down and on the diagonals
export const NEIGHBOURS = Array.from({ length: TILES }, (_, i) => {
  const row = Math.floor(i / SIZE);
  const column = i % SIZE;
  const near = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const r = row + dr;
      const c = column + dc;
      if ((dr || dc) && r >= 0 && r < SIZE && c >= 0 && c < SIZE) near.push(r * SIZE + c);
    }
  }
  return near;
});

export const touching = (a, b) => NEIGHBOURS[a]?.includes(b) ?? false;

function drawTile(random) {
  let pick = random() * BAG_TOTAL;
  for (const [tile, weight] of BAG) {
    pick -= weight;
    if (pick < 0) return tile;
  }
  return BAG[0][0];
}

// A handful of vowels and nothing piled up, so the grid isn't all consonants or all one letter
function fairGrid(grid) {
  const vowels = grid.filter((tile) => VOWELS.has(tile)).length;
  if (vowels < 4 || vowels > 7) return false;
  const counts = new Map();
  for (const tile of grid) counts.set(tile, (counts.get(tile) ?? 0) + 1);
  return [...counts].every(([tile, count]) => count <= (tile === "qu" ? 1 : 3));
}

export function drawGrid(random) {
  let grid;
  for (let tries = 0; tries < 50; tries += 1) {
    grid = Array.from({ length: TILES }, () => drawTile(random));
    if (fairGrid(grid)) break;
  }
  return grid;
}

// Every start of every word, so a search through the grid can stop as soon as no word starts that
// way. Built once per word list.
const prefixCache = new WeakMap();
function prefixesOf(words) {
  let prefixes = prefixCache.get(words);
  if (!prefixes) {
    prefixes = new Set();
    for (const word of words) {
      for (let end = 1; end < word.length; end += 1) prefixes.add(word.slice(0, end));
    }
    prefixCache.set(words, prefixes);
  }
  return prefixes;
}

// Every word in words (a Set) that can be made on the grid
export function findWords(grid, words) {
  const prefixes = prefixesOf(words);
  const found = new Set();
  const used = new Array(TILES).fill(false);
  const walk = (i, before) => {
    const sofar = before + grid[i];
    const isWord = sofar.length >= MIN_LETTERS && words.has(sofar);
    const goesOn = prefixes.has(sofar);
    if (isWord) found.add(sofar);
    if (!goesOn) return;
    used[i] = true;
    for (const next of NEIGHBOURS[i]) if (!used[next]) walk(next, sofar);
    used[i] = false;
  };
  for (let i = 0; i < TILES; i += 1) walk(i, "");
  return found;
}

// The same seed and word list always give the same grid, so both players get the same one. Grids
// with too few words in them are skipped, keeping the best one if none has enough.
export function makeBoard(seed, words) {
  const random = seededRandom(seed);
  let best = null;
  for (let tries = 0; tries < GRID_TRIES; tries += 1) {
    const grid = drawGrid(random);
    const total = findWords(grid, words).size;
    if (!best || total > best.total) best = { grid, total };
    if (total >= ENOUGH_WORDS) break;
  }
  return best;
}

export const pathWord = (grid, path) => path.map((i) => grid[i]).join("");

// The tiles that spell word, each touching the last and none used twice, or null if it can't be
// made on this grid
export function tracePath(grid, word) {
  if (!word) return null;
  const path = [];
  const used = new Set();
  const from = (i, at) => {
    const tile = grid[i];
    if (used.has(i) || !word.startsWith(tile, at)) return false;
    used.add(i);
    path.push(i);
    const next = at + tile.length;
    if (next === word.length || NEIGHBOURS[i].some((j) => from(j, next))) return true;
    used.delete(i);
    path.pop();
    return false;
  };
  for (let i = 0; i < TILES; i += 1) if (from(i, 0)) return path;
  return null;
}

// Longer words are worth a lot more, and anything past eight letters counts as eight
const POINTS = [0, 0, 0, 100, 400, 800, 1400, 1800, 2200];
export const wordPoints = (word) => POINTS[Math.min(word.length, POINTS.length - 1)];
export const scoreWords = (words) => words.reduce((sum, word) => sum + wordPoints(word), 0);

// Longest first, then A to Z
export const sortWords = (words) =>
  [...words].sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));

// At the end each player sends the words they found. A play message holds 64 at most, so a long
// list goes in parts, and past four parts only the best of them go.
export const WORDS_PER_PART = 64;
export const MAX_PARTS = 4;
const SENT_WORD = /^[a-z]{1,16}$/;

export function resultParts(words) {
  const best = sortWords(words).slice(0, WORDS_PER_PART * MAX_PARTS);
  const parts = [];
  for (let at = 0; at < best.length; at += WORDS_PER_PART) {
    parts.push(best.slice(at, at + WORDS_PER_PART));
  }
  return parts.length ? parts : [[]];
}

const whole = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;

// One part of the other player's words, or null if it doesn't look right
export function readResultPart(data) {
  const { part, parts, score, total, words } = data ?? {};
  if (!whole(parts, MAX_PARTS) || parts < 1 || !whole(part, parts - 1)) return null;
  if (!whole(score, 1e6) || !whole(total, 1e6)) return null;
  if (!Array.isArray(words) || words.length > WORDS_PER_PART) return null;
  if (!words.every((word) => typeof word === "string" && SENT_WORD.test(word))) return null;
  return { part, parts, score, total, words };
}

// All the parts put back together, or null while some are still to come. The score is the one
// they sent, worked out by the same scoreWords, so both screens show the same two numbers.
export function joinParts(received) {
  const first = received.get(0);
  if (!first || received.size < first.parts) return null;
  const words = [];
  for (let part = 0; part < first.parts; part += 1) {
    const piece = received.get(part);
    if (!piece) return null;
    for (const word of piece.words) if (!words.includes(word)) words.push(word);
  }
  return { score: first.score, total: first.total, words };
}

// Both work out who won from the same two scores. Level scores are a draw.
export function roundWinner(hostScore, guestScore) {
  if (hostScore === guestScore) return "draw";
  return hostScore > guestScore ? "host" : "guest";
}
