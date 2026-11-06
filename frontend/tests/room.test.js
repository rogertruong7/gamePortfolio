import assert from "node:assert/strict";
import { test } from "node:test";
import { ROOM_SIZE, lobbyName, pickPlaces, readMember, readState } from "../src/Multiplayer/room.js";
import { DEFAULT_LOOK } from "../src/Game/look/lookOptions.js";
import { chatName } from "../src/Multiplayer/chat.js";

const member = (id, joinedAt) => ({ id, joinedAt, look: DEFAULT_LOOK });
const crowd = (count) => Array.from({ length: count }, (_, i) => member(`p${i}`, 1000 + i));

test("there's a place for a newcomer while the room has space", () => {
  const places = pickPlaces(crowd(ROOM_SIZE - 1), member("me", 5000));
  assert.ok(places.has("me"));
  assert.equal(places.size, ROOM_SIZE);
});

test("a newcomer waits when the room is full", () => {
  const places = pickPlaces(crowd(ROOM_SIZE), member("me", 5000));
  assert.ok(!places.has("me"));
  assert.equal(places.size, ROOM_SIZE);
});

test("the earliest arrivals keep their places when two try for the last one", () => {
  const present = [...crowd(ROOM_SIZE - 1), member("other", 6000)];
  assert.ok(pickPlaces(present, member("me", 5000)).has("me"));
  assert.ok(!pickPlaces(present, member("me", 7000)).has("me"));
});

test("everyone agrees on who's in, whoever works it out", () => {
  const everyone = [...crowd(ROOM_SIZE), member("late", 9000)];
  const views = everyone.map((me) => [...pickPlaces(everyone, me)].sort().join());
  assert.equal(new Set(views).size, 1);
});

test("a state message is read when it's well formed", () => {
  const state = readState({ id: "a", x: 1, y: -8, z: 3, ry: 0.5, m: 1, e: "wave", s: 0.4, a: 0, j: 3 });
  assert.deepEqual(state, {
    id: "a",
    x: 1,
    y: -8,
    z: 3,
    ry: 0.5,
    moving: true,
    emote: "wave",
    sit: 0.4,
    away: false,
    jumps: 3,
    bench: -1,
    since: 0,
    gold: false,
  });
});

test("broken or far-fetched state messages are thrown away", () => {
  const good = { id: "a", x: 1, y: -8, z: 3, ry: 0.5, s: 0 };
  assert.equal(readState(null), null);
  assert.equal(readState({ ...good, id: 5 }), null);
  assert.equal(readState({ ...good, x: Number.NaN }), null);
  assert.equal(readState({ ...good, z: 1e9 }), null);
  assert.equal(readState({ ...good, ry: "0" }), null);
});

test("unknown emotes are ignored and sitting stays between 0 and 1", () => {
  const state = readState({ id: "a", x: 0, y: 0, z: 0, ry: 0, e: "explode", s: 5 });
  assert.equal(state.emote, null);
  assert.equal(state.sit, 1);
});

test("a member's look is cleaned up and one without an arrival time is ignored", () => {
  const read = readMember({ id: "a", meta: { joinedAt: 5, look: { hair: "nope" } } });
  assert.equal(read.look.hair, DEFAULT_LOOK.hair);
  assert.equal(readMember({ id: "a", meta: { look: {} } }), null);
});

test("a member keeps the name they picked, or gets a made-up one", () => {
  const named = readMember({ id: "a", meta: { joinedAt: 5, look: {}, name: "  Roger " } });
  assert.equal(named.name, "Roger");
  const unnamed = readMember({ id: "a", meta: { joinedAt: 5, look: {}, name: "   " } });
  assert.equal(unnamed.name, chatName("a"));
});

test("a bad jump count reads as no jumps", () => {
  const base = { id: "a", x: 0, y: 0, z: 0, ry: 0, s: 0 };
  assert.equal(readState({ ...base, j: -2 }).jumps, 0);
  assert.equal(readState({ ...base, j: "9" }).jumps, 0);
  assert.equal(readState(base).jumps, 0);
});

test("the first lobby keeps the plain name and the rest are numbered", () => {
  assert.equal(lobbyName(1), "town");
  assert.equal(lobbyName(2), "town-2");
  assert.equal(lobbyName(12), "town-12");
});

test("someone moving into a lobby arrives after everyone already there", () => {
  // Their arrival time restarts in each lobby, so the ten already in it keep their places
  const settled = crowd(ROOM_SIZE).map((m) => ({ ...m, joinedAt: m.joinedAt + 10000 }));
  assert.ok(!pickPlaces(settled, member("moved", Date.now())).has("moved"));
});

test("a bench claim is read, and a nonsense bench means none", () => {
  const base = { id: "a", x: 0, y: 0, z: 0, ry: 0, s: 1 };
  assert.deepEqual(
    [readState({ ...base, b: 1, bt: 50 }).bench, readState({ ...base, b: 1, bt: 50 }).since],
    [1, 50]
  );
  assert.equal(readState({ ...base, b: 1.5 }).bench, -1);
  assert.equal(readState({ ...base, b: -3 }).bench, -1);
  assert.equal(readState({ ...base, b: 9999 }).bench, -1);
});

test("beating Sans comes through as gold", () => {
  const base = { id: "a", x: 0, y: 0, z: 0, ry: 0, s: 0 };
  assert.equal(readState({ ...base, g: 1 }).gold, true);
  assert.equal(readState({ ...base, g: "1" }).gold, false);
});
