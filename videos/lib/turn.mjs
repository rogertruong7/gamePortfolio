// Recording and rendering take turns across processes. A render hogs the CPU, and any recording
// made alongside one comes out stuttery.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const lock = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".turn-lock");
const STALE_MS = 15 * 60 * 1000;

export async function withTurn(fn) {
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch {
      const age = Date.now() - fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs;
      if (age > STALE_MS) fs.rmSync(lock, { recursive: true, force: true });
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}
