// The messages two people sharing a bench send each other to play a game. They go only to the one
// they're addressed to, and anything that doesn't look right is thrown away.

export const GAMES = [
  { id: "connect4", name: "Connect Four", blurb: "Drop discs and line up four in a row." },
  { id: "rps", name: "Scissors Paper Rock", blurb: "Best of five. First to three wins." },
  { id: "typing", name: "Type Race", blurb: "Type the word first. Best of five." },
];
const GAME_IDS = new Set(GAMES.map((game) => game.id));

export const gameName = (id) => GAMES.find((game) => game.id === id)?.name ?? "a game";

// invite, cancel, accept and decline set a game up. leave ends it, and again asks for a rematch.
// The rest are moves: drop (Connect Four), throw (Scissors Paper Rock), and word and typed (the
// race, where the one who invited picks each word).
const KINDS = new Set([
  "invite",
  "cancel",
  "accept",
  "decline",
  "leave",
  "again",
  "drop",
  "throw",
  "word",
  "typed",
]);
export const THROWS = ["scissors", "paper", "rock"];
const MAX_WORD = 24;
// No round of anything gets anywhere near this
const MAX_COUNT = 1000;

const count = (value) => Number.isInteger(value) && value >= 0 && value < MAX_COUNT;
const shortString = (value, max = 64) => typeof value === "string" && value.length <= max;

export function readGameMessage(message) {
  if (!message || typeof message !== "object") return null;
  const { id, to, s, k } = message;
  if (!shortString(id) || !shortString(to) || !shortString(s) || !s || !KINDS.has(k)) return null;
  const read = { id, to, session: s, kind: k, match: count(message.m) ? message.m : 0 };

  if (k === "invite") {
    if (!GAME_IDS.has(message.g)) return null;
    read.game = message.g;
  } else if (k === "drop") {
    if (!count(message.n) || !count(message.c)) return null;
    read.move = message.n;
    read.column = message.c;
  } else if (k === "throw") {
    if (!count(message.r) || !THROWS.includes(message.p)) return null;
    read.round = message.r;
    read.pick = message.p;
  } else if (k === "word") {
    if (!count(message.r) || !shortString(message.w, MAX_WORD) || !/^[a-z]+$/.test(message.w)) {
      return null;
    }
    read.round = message.r;
    read.word = message.w;
  } else if (k === "typed") {
    // How many milliseconds it took them, or -1 once they can no longer win the round
    const t = message.t;
    if (!count(message.r) || !(t === -1 || (Number.isFinite(t) && t >= 0 && t < 600000))) {
      return null;
    }
    read.round = message.r;
    read.time = t === -1 ? null : t;
  }
  return read;
}

// The other way round, for sending: only the short keys go over the wire
export function writeGameMessage({ id, to, session, kind, match = 0, ...fields }) {
  const message = { id, to, s: session, k: kind, m: match };
  if (fields.game !== undefined) message.g = fields.game;
  if (fields.move !== undefined) message.n = fields.move;
  if (fields.column !== undefined) message.c = fields.column;
  if (fields.round !== undefined) message.r = fields.round;
  if (fields.pick !== undefined) message.p = fields.pick;
  if (fields.word !== undefined) message.w = fields.word;
  if (fields.time !== undefined) message.t = fields.time === null ? -1 : Math.round(fields.time);
  return message;
}

// When both ask the other at the same moment, both keep the invite from the one with the
// smaller id, so they end up agreeing on one game
export const keepsOwnInvite = (myId, theirId) => myId < theirId;
