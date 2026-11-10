import { seededRandom } from "../../shared/random.js";
import { alternating, clamp, isCount, isNumber, leader, tenth, totals } from "../../shared/skillShots.js";

// A target seen from the shooting line, in units about a centimetre each on its face, x to the
// right and y down. Ten rings of equal width score 10 in the middle down to 1 at the edge.
export const WORLD = { width: 460, height: 400 };
export const TARGET = { x: 230, y: 175, radius: 140 };
export const RING = TARGET.radius / 10;

export const ARROWS_EACH = 6;
export const ARROWS = ARROWS_EACH * 2;

// Wind is from -5 (blowing left) to 5 (right) and pushes each arrow DRIFT units per step of it
export const MAX_WIND = 5;
export const DRIFT = 8;
// Drawing the bow fully takes DRAW_SECONDS. Let go before that and the arrow drops, up to DROP.
export const DRAW_SECONDS = 0.9;
const DROP = 90;
// How far the aim wanders, and how holding the draw first steadies it and then tires the arm
export const SWAY = 16;
const STEADY_BY = 1.2;
const STEADIEST = 0.4;
const TIRING_FROM = 3;
const MOST_TIRED = 2;
const REACH = 400;

export const shooter = alternating;

// Both players' kth arrows fly in the same wind, so neither gets the calm ones
export const pairOf = (n) => Math.floor(n / 2);

export function windFor(seed, pair) {
  const random = seededRandom(seed * 3 + pair * 104729);
  return Math.round((random() * 2 - 1) * MAX_WIND * 2) / 2;
}

export const drawStrength = (held) => clamp(held / DRAW_SECONDS, 0, 1);

export function swayScale(held) {
  if (held <= 0) return 1;
  if (held < STEADY_BY) return 1 - ((1 - STEADIEST) * held) / STEADY_BY;
  if (held < TIRING_FROM) return STEADIEST;
  return Math.min(MOST_TIRED, STEADIEST + (held - TIRING_FROM) * 0.5);
}

export function ringScore(x, y) {
  const r = Math.hypot(x - TARGET.x, y - TARGET.y);
  if (r >= TARGET.radius) return 0;
  return 10 - Math.floor(r / RING);
}

// Where an arrow lands from where it was aimed, the sway when it was let go (wobble), how far the
// bow was drawn (0 to 1) and the wind
export function shootArrow({ aim, wobble, draw, wind }) {
  const x = tenth(clamp(aim.x + wobble.x + wind * DRIFT, -REACH, REACH * 2));
  const y = tenth(clamp(aim.y + wobble.y + (1 - draw) * DROP, -REACH, REACH * 2));
  return { x, y, pts: ringScore(x, y) };
}

// throws are [{ player, pts }] in the order shot
export function archeryResult(throws) {
  const sums = totals(throws);
  const over = throws.length >= ARROWS;
  return { over, winner: over ? leader(sums) : null, totals: sums };
}

// The other player's arrow, or null if it doesn't make sense. Their score is kept as sent.
export function readArrow(data) {
  const { n, x, y, pts } = data;
  if (!isCount(n) || !isNumber(x, REACH * 2) || !isNumber(y, REACH * 2)) return null;
  if (!Number.isInteger(pts) || pts < 0 || pts > 10) return null;
  return { x, y, pts };
}
