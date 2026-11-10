import { clamp, isCount, isNumber, leader, scatter, tenth, totals } from "./skillShots.js";

// A dartboard in millimetres from the middle, x to the right and y down, with the numbers going
// clockwise from 20 at the top as on a real board
export const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const RINGS = {
  bull: 6.35,
  outer: 15.9,
  trebleIn: 99,
  trebleOut: 107,
  doubleIn: 162,
  doubleOut: 170,
};

// 501 takes too long for a bench, so it's three rounds of three darts each and the higher total
// wins. A tie goes to single darts, one each, until one of them beats the other.
export const ROUNDS = 3;
export const DARTS = 3;
export const REGULATION = ROUNDS * DARTS * 2;

// How the throw goes: the power meter wants letting go at SWEET, and every bit off it sends the
// dart DROP mm high (too hard) or low (too soft)
export const SWEET = 0.75;
export const SWEET_BAND = 0.05;
export const DROP = 140;
export const METER_SECONDS = 0.85;
export const SWAY_MM = 9;
const SCATTER_MM = 3;
// Darts can land off the board, but not off the wall
const REACH = 240;

export function scoreDart(x, y) {
  const r = Math.hypot(x, y);
  if (r <= RINGS.bull) return { pts: 50, hit: "bull" };
  if (r <= RINGS.outer) return { pts: 25, hit: "outer" };
  if (r > RINGS.doubleOut) return { pts: 0, hit: "miss" };
  // Turns clockwise from straight up, shifted half a sector so 20 runs either side of the top
  const turns = (Math.atan2(x, -y) / (2 * Math.PI) + 1 + 1 / 40) % 1;
  const number = SECTORS[Math.floor(turns * SECTORS.length) % SECTORS.length];
  if (r >= RINGS.trebleIn && r <= RINGS.trebleOut) return { pts: number * 3, hit: `t${number}` };
  if (r >= RINGS.doubleIn) return { pts: number * 2, hit: `d${number}` };
  return { pts: number, hit: `s${number}` };
}

export function hitName(hit) {
  if (hit === "bull") return "Bullseye";
  if (hit === "outer") return "Outer bull";
  if (hit === "miss") return "Missed the board";
  const kind = { t: "Treble ", d: "Double ", s: "" }[hit[0]];
  return `${kind}${hit.slice(1)}`;
}

// Where a dart lands from where it was aimed (aim, in mm), the sway of the hand when it was let
// go (wobble), the meter's power then, and a little random spread
export function throwDart({ aim, wobble, power, random = Math.random }) {
  const x = tenth(clamp(aim.x + wobble.x + scatter(random, SCATTER_MM), -REACH, REACH));
  const y = tenth(
    clamp(aim.y + wobble.y + (SWEET - power) * DROP + scatter(random, SCATTER_MM), -REACH, REACH)
  );
  return { x, y, ...scoreDart(x, y) };
}

// In the three rounds each throws three darts in a row, and in sudden death one each. Whoever
// sent the invite opens the first game, and each rematch swaps who goes first.
export const dartThrower = (n, match) =>
  n < REGULATION ? (Math.floor(n / DARTS) + match) % 2 : (n - REGULATION + match) % 2;

// Which round (from 0) a dart is in, with each sudden-death pair as a round of its own
export const roundOf = (n) =>
  n < REGULATION ? Math.floor(n / (DARTS * 2)) : ROUNDS + Math.floor((n - REGULATION) / 2);

// The darts that are thrown together and stay on the board until the next lot: a player's three
// in a round, or a single dart in sudden death
export const visitOf = (n) => (n < REGULATION ? Math.floor(n / DARTS) : n);

// throws are [{ player, pts }] in the order thrown. totals counts the three rounds only.
export function dartsResult(throws) {
  const sums = totals(throws.slice(0, REGULATION));
  if (throws.length < REGULATION) return { over: false, winner: null, totals: sums, sudden: false };
  let winner = leader(sums);
  for (let i = REGULATION; winner === null && i + 1 < throws.length; i += 2) {
    winner = leader(totals(throws.slice(i, i + 2)));
  }
  return { over: winner !== null, winner, totals: sums, sudden: leader(sums) === null };
}

const HIT = /^(bull|outer|miss|[sdt]([1-9]|1[0-9]|20))$/;

// The other player's dart, or null if it doesn't add up. Their score is kept as sent, so both
// screens count the same numbers.
export function readDart(data) {
  const { n, x, y, pts, hit } = data;
  if (!isCount(n) || !isNumber(x, REACH) || !isNumber(y, REACH)) return null;
  if (typeof hit !== "string" || !HIT.test(hit) || !Number.isInteger(pts)) return null;
  const expected =
    hit === "bull"
      ? 50
      : hit === "outer"
        ? 25
        : hit === "miss"
          ? 0
          : Number(hit.slice(1)) * { s: 1, d: 2, t: 3 }[hit[0]];
  if (pts !== expected) return null;
  return { x, y, pts, hit };
}
