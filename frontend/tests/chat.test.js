import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BURST,
  BURST_SECONDS,
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  chatName,
  cleanChat,
  cleanName,
  createChatLimiter,
  readChat,
} from "../src/Multiplayer/chat.js";

test("a chat message is read when it's well formed", () => {
  assert.deepEqual(readChat({ id: "a", t: "  hello   there " }), { id: "a", text: "hello there" });
});

test("a chat message with nothing to say is dropped", () => {
  assert.equal(readChat({ id: "a", t: "   " }), null);
  assert.equal(readChat({ id: "a", t: 5 }), null);
  assert.equal(readChat({ t: "hi" }), null);
  assert.equal(readChat(null), null);
});

test("long messages are cut short", () => {
  assert.equal(cleanChat("x".repeat(500)).length, MAX_CHAT_LENGTH);
});

test("line breaks and hidden characters become plain spaces", () => {
  assert.equal(cleanChat("a\nb\u202ec\u200bd"), "a b c d");
});

test("everyone works out the same name for the same id", () => {
  assert.equal(chatName("abc-123"), chatName("abc-123"));
  assert.match(chatName("abc-123"), /^\w+ \w+$/);
});

test("someone who says too much too fast is held back until it's been long enough", () => {
  const limiter = createChatLimiter();
  for (let i = 0; i < BURST; i += 1) assert.ok(limiter.allow("a", i));
  assert.ok(!limiter.allow("a", BURST));
  assert.ok(limiter.allow("b", BURST), "others aren't held back");
  assert.ok(limiter.allow("a", BURST_SECONDS * 1000 + 1));
});

test("a picked name is tidied and kept short", () => {
  assert.equal(cleanName("  Roger\n  the   Great  "), "Roger the Great");
  assert.equal(cleanName("x".repeat(50)).length, MAX_NAME_LENGTH);
  assert.equal(cleanName(42), "");
});
