// The messages two people sharing a bench send each other to play a game. They go only to the one
// they're addressed to, and anything that doesn't look right is thrown away.

export const GAMES = [
  { id: "connect4", name: "Connect Four", blurb: "Drop discs and line up four in a row." },
  { id: "rps", name: "Scissors Paper Rock", blurb: "Best of five. First to three wins." },
  { id: "typing", name: "Type Race", blurb: "Type the word first. Best of five." },
  { id: "wordhunt", name: "Word Hunt", blurb: "Swipe letters to make words. 80 seconds." },
  { id: "anagrams", name: "Anagrams", blurb: "Make words from six letters. 60 seconds." },
  { id: "seabattle", name: "Sea Battle", blurb: "Hide your fleet and sink theirs first." },
  { id: "dots", name: "Dots & Boxes", blurb: "Close a box to go again. Most boxes wins." },
  { id: "gomoku", name: "Five in a Row", blurb: "Take turns placing stones. Five in a row wins." },
  { id: "checkers", name: "Checkers", blurb: "Jump their pieces. Taking is a must." },
  { id: "pool", name: "Pool", blurb: "8-ball. Pot your group, then the black." },
  { id: "cuptoss", name: "Cup Toss", blurb: "Flick the ball into their cups. Clear all six." },
  { id: "minigolf", name: "Mini Golf", blurb: "Six holes, taking turns. Lowest score wins." },
  { id: "darts", name: "Darts", blurb: "Three rounds of three darts. Highest score wins." },
  { id: "hoops", name: "Hoops", blurb: "Ten shots each. A swish scores 3." },
  { id: "archery", name: "Archery", blurb: "Six arrows each. Mind the wind." },
];
const GAME_IDS = new Set(GAMES.map((game) => game.id));

export const gameName = (id) => GAMES.find((game) => game.id === id)?.name ?? "a game";

// invite, cancel, accept and decline set a game up. leave ends it, and again asks for a rematch.
// The rest are moves: drop (Connect Four), throw (Scissors Paper Rock), word and typed (the race,
// where the one who invited picks each word), and play, which every other game uses with its own
// fields in data (see readPlayData).
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
  "play",
]);
export const THROWS = ["scissors", "paper", "rock"];
const MAX_WORD = 24;
// No round of anything gets anywhere near this
const MAX_COUNT = 1000;

const count = (value) => Number.isInteger(value) && value >= 0 && value < MAX_COUNT;
const shortString = (value, max = 64) => typeof value === "string" && value.length <= max;

// What a play message's data may hold: a flat object of up to MAX_FIELDS short lowercase keys,
// each a finite number, a short lowercase string, or a list of up to MAX_LIST of either. Each game
// then checks its own fields, so this only keeps out anything odd-shaped or oversized.
const MAX_FIELDS = 16;
const MAX_LIST = 64;
const MAX_NUMBER = 1e6;
const KEY = /^[a-z][a-z0-9]{0,11}$/;
const TEXT = /^[a-z0-9]{0,32}$/;

const playValue = (value) =>
  (typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= MAX_NUMBER) ||
  (typeof value === "string" && TEXT.test(value));

export function readPlayData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const keys = Object.keys(data);
  if (keys.length > MAX_FIELDS) return null;
  const read = {};
  for (const key of keys) {
    const value = data[key];
    if (!KEY.test(key)) return null;
    if (Array.isArray(value)) {
      if (value.length > MAX_LIST || !value.every(playValue)) return null;
      read[key] = [...value];
    } else if (playValue(value)) {
      read[key] = value;
    } else {
      return null;
    }
  }
  return read;
}

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
  } else if (k === "play") {
    const data = readPlayData(message.d);
    if (!data) return null;
    read.data = data;
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
  if (fields.data !== undefined) message.d = fields.data;
  return message;
}

// When both ask the other at the same moment, both keep the invite from the one with the
// smaller id, so they end up agreeing on one game
export const keepsOwnInvite = (myId, theirId) => myId < theirId;
