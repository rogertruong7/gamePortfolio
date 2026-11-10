import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePayload } from "../api/_lib/payload.js";

const VISITOR = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";

const valid = (overrides = {}) => ({
  visitorId: VISITOR,
  sessionId: SESSION,
  activeMs: 1000,
  context: {},
  events: [],
  ...overrides,
});

test("a well-formed payload passes through", () => {
  const result = sanitizePayload(
    valid({
      events: [{ type: "cv_download", name: "cv.pdf", path: "/", ageMs: 5 }],
    })
  );
  assert.equal(result.visitorId, VISITOR);
  assert.deepEqual(result.events[0], {
    type: "cv_download",
    name: "cv.pdf",
    path: "/",
    meta: null,
    ageMs: 5,
  });
});

test("payloads without valid ids are rejected", () => {
  assert.equal(sanitizePayload(null), null);
  assert.equal(sanitizePayload(valid({ visitorId: "nope" })), null);
  assert.equal(sanitizePayload(valid({ sessionId: "'; DROP TABLE" })), null);
  assert.equal(sanitizePayload(valid({ events: "nope" })), null);
});

test("ids that only pass as uuids once coerced to strings are rejected", () => {
  assert.equal(sanitizePayload(valid({ visitorId: [VISITOR] })), null);
  assert.equal(sanitizePayload(valid({ sessionId: [SESSION] })), null);
});

test("unknown event types are dropped", () => {
  const result = sanitizePayload(
    valid({ events: [{ type: "made_up" }, { type: "first_move" }, null] })
  );
  assert.deepEqual(
    result.events.map((event) => event.type),
    ["first_move"]
  );
});

test("batch size, text length and meta size are capped", () => {
  const result = sanitizePayload(
    valid({
      events: Array.from({ length: 80 }, () => ({
        type: "outbound_click",
        name: "x".repeat(1000),
        meta: { big: "y".repeat(5000) },
      })),
    })
  );
  assert.equal(result.events.length, 50);
  assert.equal(result.events[0].name.length, 300);
  assert.equal(result.events[0].meta, null);
});

test("time values are clamped so they cannot rewrite history", () => {
  const result = sanitizePayload(
    valid({
      activeMs: 1e12,
      events: [
        { type: "first_move", ageMs: 1e12 },
        { type: "first_move", ageMs: -50 },
        { type: "first_move", ageMs: "soon" },
      ],
    })
  );
  assert.equal(result.activeMs, 6 * 60 * 60 * 1000);
  assert.deepEqual(
    result.events.map((event) => event.ageMs),
    [60 * 60 * 1000, 0, 0]
  );
  assert.equal(sanitizePayload(valid({ activeMs: -5 })).activeMs, 0);
});

test("only known browser fields are kept", () => {
  const result = sanitizePayload(
    valid({
      context: {
        client: { screenWidth: 1440, language: "en-AU", secret: "drop me" },
        utm: { source: "linkedin", evil: "drop me" },
      },
    })
  );
  assert.deepEqual(result.context.client, {
    screenWidth: 1440,
    language: "en-AU",
  });
  assert.deepEqual(result.context.utm, { source: "linkedin" });
});
