import { WORDS } from "./words.js";

// Five words at most, and the first to win three takes it
export const WINS_NEEDED = 3;

export function pickWord(used, random = Math.random) {
  const fresh = WORDS.filter((word) => !used.includes(word));
  const from = fresh.length ? fresh : WORDS;
  return from[Math.floor(random() * from.length)];
}

// What counts as having typed it: the same letters, in any case, with spaces at the ends ignored
export const typedIt = (typed, word) => typed.trim().toLowerCase() === word;

// Each player times themselves from when the word appeared on their own screen, so neither is
// slowed by the connection. A null time means they gave up once the other's time was beaten.
// Both players have the same two times, so both work out the same winner. A dead heat goes to
// whoever sent the invite.
export function roundWinner(hostTime, guestTime) {
  if (hostTime === undefined || guestTime === undefined) return null;
  if (hostTime === null) return "guest";
  if (guestTime === null) return "host";
  return hostTime <= guestTime ? "host" : "guest";
}

// Once the other has finished, there's no point carrying on once this player is slower
export const cantWin = (elapsed, theirTime) =>
  typeof theirTime === "number" && elapsed >= theirTime;
