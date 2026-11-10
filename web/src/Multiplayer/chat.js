import { readStore, writeStore } from "../Helpers/storage.js";

// Chat between the characters in one lobby. Messages go out to whoever is there right now and
// aren't kept anywhere, so someone arriving later only sees what's said after they arrive.

export const MAX_CHAT_LENGTH = 160;
// How many messages the log holds before the oldest go
export const KEEP_MESSAGES = 50;
// Each person can say this many things in this many seconds. A tab sends no faster than that, and
// anything faster arriving from someone else is dropped.
export const BURST = 5;
export const BURST_SECONDS = 10;

// Control characters and the invisible ones used to fake line breaks or reverse text
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const UNWANTED = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g;

export function cleanChat(text) {
  if (typeof text !== "string") return "";
  return text.replace(UNWANTED, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHAT_LENGTH);
}

export function readChat(message) {
  if (!message || typeof message !== "object" || typeof message.id !== "string") return null;
  const text = cleanChat(message.t);
  if (!text) return null;
  return { id: message.id.slice(0, 64), text };
}

// How long something said stays over the speaker's head (Game/players/ChatBubble.jsx)
export const SHOW_SAID_SECONDS = 6;

// The newest thing a sender said that's still worth showing. A null sender is this tab.
export function latestSaid(messages, sender) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (sender === null ? message.mine : message.sender === sender) {
      return Date.now() - message.at < SHOW_SAID_SECONDS * 1000 ? message : null;
    }
  }
  return null;
}

export const MAX_NAME_LENGTH = 20;
const NAME_STORE_KEY = "chatName";

// A name someone has picked for themselves, or "" for none
export function cleanName(text) {
  return cleanChat(text).slice(0, MAX_NAME_LENGTH).trim();
}

export function loadChatName() {
  return cleanName(readStore(NAME_STORE_KEY) ?? "");
}

export function saveChatName(name) {
  writeStore(NAME_STORE_KEY, cleanName(name));
}

// Until someone picks a name, they get one made from their id. Every tab works out the same one.
const ADJECTIVES = [
  "Sleepy", "Brave", "Mossy", "Sunny", "Quiet", "Lucky", "Misty", "Cosy",
  "Swift", "Gentle", "Rusty", "Plucky", "Breezy", "Dusky", "Merry", "Wandering",
];
const ANIMALS = [
  "Fox", "Otter", "Heron", "Badger", "Koi", "Sparrow", "Hare", "Owl",
  "Frog", "Moth", "Deer", "Crane", "Newt", "Wren", "Beetle", "Cat",
];

export function chatName(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `${ADJECTIVES[hash % ADJECTIVES.length]} ${ANIMALS[(hash >>> 8) % ANIMALS.length]}`;
}

// Remembers when each person last spoke, and says whether they can say something now
export function createChatLimiter(burst = BURST, seconds = BURST_SECONDS) {
  const said = new Map();
  return {
    allow(id, now) {
      const recent = (said.get(id) ?? []).filter((at) => now - at < seconds * 1000);
      if (recent.length >= burst) {
        said.set(id, recent);
        return false;
      }
      recent.push(now);
      said.set(id, recent);
      return true;
    },
    clear() {
      said.clear();
    },
  };
}
