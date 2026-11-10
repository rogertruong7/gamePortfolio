// Bits shared by Cup Toss and Mini Golf, where one screen works out where a throw or putt went
// and sends it to the other.

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Numbers sent in a move are cut to a few decimal places first, and the sender plays on with the
// cut value too, so both screens run the same sums on exactly the same numbers
export const roundTo = (value, places = 4) => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};

// Holding Space fills a power meter that rises to full and falls back again, over and over, so
// letting go at the right moment is the skill. heldMs is how long it's been held, and periodMs how
// long one rise and fall takes.
export const METER_PERIOD_MS = 1800;
export function meterPower(heldMs, periodMs = METER_PERIOD_MS) {
  const phase = (Math.max(0, heldMs) % periodMs) / periodMs;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

// Whose go it is after this many throws or strokes. The first game is opened by whoever sent the
// invite (player 0), and each rematch swaps who goes first.
export const turnAfter = (moves, match) => (moves + match) % 2;

// A finite number no further than limit from zero, for checking what the other player sent
export const finiteIn = (value, limit) =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

export const prefersLessMotion = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
