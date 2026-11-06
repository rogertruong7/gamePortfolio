import { EMOTES } from "../Game/emotes.js";
import { sameLook, sanitizeLook } from "../Game/look/lookOptions.js";
import {
  KEEP_MESSAGES,
  chatName,
  cleanChat,
  cleanName,
  createChatLimiter,
  readChat,
} from "./chat.js";
import { HAS_SERVER, createLocalTransport, createSupabaseTransport } from "./transports.js";

// Each lobby holds this many characters at once. The first ten to arrive in it get the places, so
// everyone works out the same ten without a server deciding. Anyone after that moves on to the
// next lobby, which is another copy of the town with its own ten places.
export const ROOM_SIZE = 10;
// Past this many lobbies, a visitor just waits in the last one for a place
export const MAX_LOBBIES = 50;

// While walking, a character's position goes out this often. Standing still, it only goes out
// now and then so a newcomer learns where everyone is.
const SEND_EVERY_MS = 150;
const HEARTBEAT_MS = 3000;
// How many recent snapshots are kept of each character, for smoothing out its movement
const KEEP_SNAPSHOTS = 12;
// Anything further out than this is nonsense, so it's thrown away
const WORLD_LIMIT = 2000;

const EMOTE_IDS = new Set(EMOTES.map((emote) => emote.id));
// More than the town has. A number that isn't a real bench just never matches one.
const MAX_BENCH = 32;

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const inWorld = (value) => finite(value) && Math.abs(value) < WORLD_LIMIT;

export function readState(message) {
  if (!message || typeof message !== "object" || typeof message.id !== "string") return null;
  const { x, y, z, ry, s } = message;
  if (![x, y, z].every(inWorld) || !finite(ry) || !finite(s)) return null;
  return {
    id: message.id.slice(0, 64),
    x,
    y,
    z,
    ry,
    moving: message.m === 1,
    emote: EMOTE_IDS.has(message.e) ? message.e : null,
    sit: Math.min(1, Math.max(0, s)),
    away: message.a === 1,
    // How many times they've jumped, so a new one shows as the count going up
    jumps: finite(message.j) && message.j >= 0 ? Math.floor(message.j) : 0,
    // The bench they're sitting on or heading for, and when they claimed it
    bench: Number.isInteger(message.b) && message.b >= 0 && message.b < MAX_BENCH ? message.b : -1,
    since: finite(message.bt) ? message.bt : 0,
    // Beat Sans, so has the gold hair and the flame
    gold: message.g === 1,
  };
}

export function readMember({ id, meta }) {
  if (typeof id !== "string" || !meta || !finite(meta.joinedAt)) return null;
  const shortId = id.slice(0, 64);
  return {
    id: shortId,
    joinedAt: meta.joinedAt,
    look: sanitizeLook(meta.look),
    // The name they picked for chatting, or one made up for them
    name: cleanName(meta.name) || chatName(shortId),
  };
}

export const lobbyName = (lobby) => (lobby === 1 ? "town" : `town-${lobby}`);

const byArrival = (a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1);

// The ids that get a place: the first ROOM_SIZE to arrive, out of everyone present and this tab
export function pickPlaces(present, me) {
  const wanting = [...present.filter((member) => member.id !== me.id), me];
  return new Set(
    wanting
      .sort(byArrival)
      .slice(0, ROOM_SIZE)
      .map((member) => member.id)
  );
}

// Joins the first lobby with a free place and keeps up with everyone else in it. localState is
// read for this character's own position each time one goes out. onChange hears who is in the
// lobby and what's been said there, and peers holds everyone's latest snapshots for drawing each
// frame.
export function joinRoom({ look, name, localState, onChange }) {
  const id = newId();
  // Everyone else known about in this lobby, by id. Snapshots can arrive before the presence that
  // says who they're from, so they're kept here either way.
  const peers = new Map();
  let myLook = look;
  let myName = cleanName(name) || chatName(id);
  let lobby = 1;
  // When this tab arrived in its current lobby. It starts again in each one, so moving into a
  // lobby never takes the place of someone already there.
  let joinedAt = Date.now();
  let status = "connecting";
  let connection = "connecting";
  let inRoom = false;
  let closed = false;
  let transport = null;
  // Goes up with each lobby, so anything still arriving from one already left is ignored
  let visit = 0;
  let lastSent = null;
  let lastSentAt = 0;
  let members = [];
  // What's been said in this lobby since arriving, oldest first
  let messages = [];
  let messageCount = 0;
  const limiter = createChatLimiter();

  const peerFor = (peerId) => {
    if (!peers.has(peerId)) {
      peers.set(peerId, { id: peerId, look: null, name: null, inRoom: false, snapshots: [] });
    }
    return peers.get(peerId);
  };

  const report = () => {
    const occupants = [...peers.values()].filter((peer) => peer.inRoom && peer.look);
    onChange({
      status,
      lobby,
      count: occupants.length + (inRoom ? 1 : 0),
      peers: occupants.map(({ id: peerId, look: peerLook }) => ({ id: peerId, look: peerLook })),
      messages,
      name: myName,
    });
  };

  const sendState = (force = false) => {
    if (!transport || !inRoom) return;
    const state = localState.current;
    if (!state.ready) return;
    if (!inWorld(state.x) || !inWorld(state.y) || !inWorld(state.z) || !finite(state.ry)) return;
    const message = {
      id,
      x: Math.round(state.x * 100) / 100,
      y: Math.round(state.y * 100) / 100,
      z: Math.round(state.z * 100) / 100,
      ry: Math.round(state.ry * 1000) / 1000,
      m: state.moving ? 1 : 0,
      e: state.emote ?? null,
      s: Math.round((state.sit ?? 0) * 100) / 100,
      a: state.away ? 1 : 0,
      j: state.jumps ?? 0,
      b: state.bench ?? -1,
      g: state.gold ? 1 : 0,
      bt: state.benchSince ?? 0,
    };
    const now = performance.now();
    const changed =
      !lastSent || Object.keys(message).some((key) => message[key] !== lastSent[key]);
    if (!force && !changed && now - lastSentAt < HEARTBEAT_MS) return;
    transport.send(message);
    lastSent = message;
    lastSentAt = now;
  };

  // Works out the ten from everyone present, then takes a place or moves on to the next lobby
  const settle = () => {
    const present = members.filter((member) => member.id !== id);
    const placed = pickPlaces(present, { id, joinedAt });
    const getsPlace = placed.has(id);
    const here = visit;
    if (!getsPlace && inRoom) {
      inRoom = false;
      transport.clearPresence();
    }
    // Stepping out can report the members again, and that may already have moved on
    if (here !== visit) return;
    if (!getsPlace && lobby < MAX_LOBBIES) {
      enter(lobby + 1);
      return;
    }
    if (getsPlace && !inRoom) {
      inRoom = true;
      share();
    }

    let newcomer = false;
    present.forEach((member) => {
      const peer = peerFor(member.id);
      if (!peer.inRoom && placed.has(member.id)) newcomer = true;
      // Kept as the same object while it's unchanged, so their character isn't dressed again on
      // every presence sync
      if (!peer.look || !sameLook(peer.look, member.look)) peer.look = member.look;
      peer.name = member.name;
      peer.inRoom = placed.has(member.id);
    });
    const presentIds = new Set(present.map((member) => member.id));
    peers.forEach((peer, peerId) => {
      if (!presentIds.has(peerId)) peers.delete(peerId);
    });

    status = connection !== "online" ? connection : inRoom ? "online" : "full";
    report();
    // So whoever just arrived sees this character straight away
    if (newcomer) sendState(true);
  };

  function enter(next) {
    visit += 1;
    const thisVisit = visit;
    const current = () => thisVisit === visit && !closed;
    transport?.close();
    transport = null;
    lobby = next;
    joinedAt = Date.now();
    inRoom = false;
    members = [];
    connection = "connecting";
    lastSent = null;
    peers.clear();
    // Each lobby has its own conversation
    messages = [];
    limiter.clear();
    status = "connecting";
    report();

    const handlers = {
      onMembers(list) {
        if (!current()) return;
        members = list.map(readMember).filter(Boolean);
        if (transport) settle();
      },
      onMessage(message) {
        if (!current()) return;
        const state = readState(message);
        if (!state || state.id === id) return;
        const peer = peerFor(state.id);
        peer.snapshots.push({ ...state, at: performance.now() });
        if (peer.snapshots.length > KEEP_SNAPSHOTS) peer.snapshots.shift();
      },
      onChat(message) {
        if (!current()) return;
        const chat = readChat(message);
        // Only someone with a place in this lobby can be heard in it
        if (!chat || chat.id === id || !peers.get(chat.id)?.inRoom) return;
        if (!limiter.allow(chat.id, performance.now())) return;
        addMessage(chat.id, chat.text);
      },
      onStatus(next) {
        if (!current()) return;
        connection = next;
        if (next !== "online") inRoom = false;
        if (next === "online" && transport) {
          settle();
          return;
        }
        // Online only counts once the lobby has been worked out
        status = next === "online" ? "connecting" : next;
        report();
      },
    };

    const name = lobbyName(lobby);
    const start = HAS_SERVER
      ? createSupabaseTransport(id, handlers, name)
      : Promise.resolve(createLocalTransport(id, handlers, name));
    start
      .then((ready) => {
        if (!current()) {
          ready.close();
          return;
        }
        transport = ready;
        if (connection === "online") settle();
      })
      .catch((error) => {
        if (!current()) return;
        console.error("Couldn't join the multiplayer room", error);
        status = "offline";
        report();
      });
  }

  // Tells the lobby who this character is
  function share() {
    transport.setPresence({ joinedAt, look: myLook, name: myName });
  }

  const addMessage = (from, text) => {
    messageCount += 1;
    const mine = from === id;
    // Kept with the name they had when they said it, so renaming doesn't rewrite the log
    const by = mine ? myName : (peers.get(from)?.name ?? chatName(from));
    messages = [...messages, { key: messageCount, from: by, mine, text }].slice(-KEEP_MESSAGES);
    report();
  };

  const timer = setInterval(() => sendState(), SEND_EVERY_MS);
  enter(1);

  const leave = () => {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    transport?.close();
  };
  window.addEventListener("pagehide", leave);

  return {
    id,
    peers,
    // Who else in the lobby is on a bench or heading for one, for sharing it (sitting.js)
    benchClaims() {
      const claims = [];
      peers.forEach((peer) => {
        const latest = peer.snapshots[peer.snapshots.length - 1];
        if (peer.inRoom && latest && latest.bench >= 0 && !latest.away) {
          claims.push({ id: peer.id, bench: latest.bench, since: latest.since });
        }
      });
      return claims;
    },
    // Says something to the lobby. False if it couldn't go out, so the text can be kept.
    say(raw) {
      const text = cleanChat(raw);
      if (!text || !transport || !inRoom) return false;
      if (!limiter.allow(id, performance.now())) return false;
      transport.sendChat({ id, t: text });
      addMessage(id, text);
      return true;
    },
    setLook(next) {
      myLook = next;
      if (inRoom) share();
    },
    setName(next) {
      myName = cleanName(next) || chatName(id);
      if (inRoom) share();
      report();
    },
    leave() {
      window.removeEventListener("pagehide", leave);
      leave();
    },
  };
}
