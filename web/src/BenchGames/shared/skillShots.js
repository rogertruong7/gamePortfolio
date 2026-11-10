// Bits the throwing games (darts, hoops and archery) share: how a held throw's power meter moves,
// how a hand sways while aiming, and how a throw's numbers are kept short enough to send.

// The power meter while a throw is held: from 0 up to 1 over period seconds, back down, and so
// on, so holding too long isn't the end of it, just a wait for the next pass
export function pingPong(seconds, period) {
  const u = (Math.max(0, seconds) / period) % 2;
  return u <= 1 ? u : 2 - u;
}

// A wandering hand: two slow wobbles on each axis at speeds that don't line up, so the drift
// never settles into a loop that's easy to time
export const sway = (seconds, size) => ({
  x: size * (0.7 * Math.sin(seconds * 1.3) + 0.3 * Math.sin(seconds * 3.1 + 1)),
  y: size * (0.7 * Math.cos(seconds * 1.1) + 0.3 * Math.sin(seconds * 2.7 + 2)),
});

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Rounded to a tenth before it's used, so the numbers sent are exactly the ones the result is from
export const tenth = (value) => Math.round(value * 10) / 10;

// A small random nudge from -size to size, more often near the middle
export const scatter = (random, size) => (random() + random() - 1) * size;

// For checking what the other player sent
export const isNumber = (value, limit) =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

// The throw number the other player sent, which has to be a plain count
export const isCount = (value) => Number.isInteger(value) && value >= 0 && value < 1000;

// Who throws a game's nth throw when they simply take turns: the one who sent the invite opens
// the first game and each rematch swaps who goes first, like Connect Four
export const alternating = (n, match) => (n + match) % 2;

// The two players' running totals from the throws so far, as [the inviter's, the other's]
export const totals = (throws) =>
  throws.reduce((sums, { player, pts }) => {
    sums[player] += pts;
    return sums;
  }, [0, 0]);

// 0 or 1 for whoever has more, or null for a draw
export const leader = ([a, b]) => (a === b ? null : a > b ? 0 : 1);
