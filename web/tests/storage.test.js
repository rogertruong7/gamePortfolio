import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readStore, writeStore } from "../src/Helpers/storage.js";

const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

afterEach(() => {
  if (original) Object.defineProperty(globalThis, "localStorage", original);
  else delete globalThis.localStorage;
});

const useStorage = (getter) =>
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get: getter });

test("values go to localStorage when it works", () => {
  const values = new Map();
  useStorage(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }));
  writeStore("working", "yes");
  assert.equal(values.get("working"), "yes");
  assert.equal(readStore("working"), "yes");
});

test("blocked storage falls back to memory instead of throwing", () => {
  useStorage(() => {
    throw new Error("SecurityError");
  });
  assert.equal(readStore("blocked"), null);
  writeStore("blocked", "yes");
  assert.equal(readStore("blocked"), "yes");
});
