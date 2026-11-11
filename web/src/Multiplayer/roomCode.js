// Rooms besides the main town have a four letter code, kept in the address as ?room=CODE so the
// link can be shared. No code, or one that isn't a real code, means the main town.
// I and O are left out, as they're easy to mistake for 1 and 0 when reading a code out.
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;
export const ROOM_PARAM = "room";

export function newRoomCode(random = Math.random) {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += LETTERS[Math.floor(random() * LETTERS.length)];
  }
  return code;
}

// The code from the address, in capitals, or null for the main town
export function readRoomCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (code.length !== CODE_LENGTH || ![...code].every((letter) => LETTERS.includes(letter))) {
    return null;
  }
  return code;
}

// The link to a room, from the page's own address
export function roomLink(code, location = window.location) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  if (code) url.searchParams.set(ROOM_PARAM, code);
  return url.toString();
}

// The room this tab was last in, kept for the session so a way back to the town from a page
// outside it (a project page, a wrong address, the error page) returns to the same room.
// sessionStorage can throw when the browser blocks storage, which just means the main town.
const LAST_ROOM_KEY = "lastRoom";

export function rememberRoom(code) {
  try {
    if (code) sessionStorage.setItem(LAST_ROOM_KEY, code);
    else sessionStorage.removeItem(LAST_ROOM_KEY);
  } catch {
    // Nothing to keep it in, so the way back goes to the main town
  }
}

function lastRoom() {
  try {
    return readRoomCode(sessionStorage.getItem(LAST_ROOM_KEY));
  } catch {
    return null;
  }
}

// Where "back to the town" goes: the room this tab was in, or the main town
export function townPath(code = lastRoom()) {
  return code ? `/?${ROOM_PARAM}=${code}` : "/";
}
