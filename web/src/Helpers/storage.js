// localStorage throws when a browser blocks it, and just touching it can be enough.
// Values then last until the page reloads, which is all the site needs from them.
const memoryStore = new Map();

export function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}
