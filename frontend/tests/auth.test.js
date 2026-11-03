import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSessionToken,
  isValidSessionToken,
  passwordMatches,
} from "../api/_lib/auth.js";

test("the right password matches and anything else does not", () => {
  assert.equal(passwordMatches("hunter2", "hunter2"), true);
  assert.equal(passwordMatches("hunter3", "hunter2"), false);
  assert.equal(passwordMatches("", "hunter2"), false);
  assert.equal(passwordMatches(undefined, "hunter2"), false);
});

test("nothing matches when no password is configured", () => {
  assert.equal(passwordMatches("anything", null), false);
  assert.equal(passwordMatches("", ""), false);
  assert.equal(isValidSessionToken("1.abc", null), false);
});

test("a fresh session token is valid", () => {
  const token = createSessionToken("hunter2");
  assert.equal(isValidSessionToken(token, "hunter2"), true);
});

test("a token stops working when it expires", () => {
  const eightDays = 8 * 24 * 60 * 60 * 1000;
  const token = createSessionToken("hunter2", Date.now() - eightDays);
  assert.equal(isValidSessionToken(token, "hunter2"), false);
});

test("changing the password invalidates existing tokens", () => {
  const token = createSessionToken("old-password");
  assert.equal(isValidSessionToken(token, "new-password"), false);
});

test("a forged or malformed token is rejected", () => {
  const [expiresAt] = createSessionToken("hunter2").split(".");
  assert.equal(isValidSessionToken(`${expiresAt}.forged`, "hunter2"), false);
  assert.equal(isValidSessionToken("9999999999.", "hunter2"), false);
  assert.equal(isValidSessionToken("not-a-token", "hunter2"), false);
  assert.equal(isValidSessionToken(undefined, "hunter2"), false);
});

test("extending a token's expiry breaks its signature", () => {
  const [, signature] = createSessionToken("hunter2").split(".");
  assert.equal(isValidSessionToken(`9999999999.${signature}`, "hunter2"), false);
});
