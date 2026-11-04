import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_NEW_SESSIONS_PER_HOUR, tooManyNewSessions } from "../api/_lib/limits.js";

const sqlReturning = (recent) => {
  const calls = [];
  const sql = {
    query: async (text, params) => {
      calls.push({ text, params });
      return [{ recent }];
    },
  };
  return { sql, calls };
};

test("new sessions are allowed up to the hourly limit", async () => {
  const { sql, calls } = sqlReturning(MAX_NEW_SESSIONS_PER_HOUR - 1);
  assert.equal(await tooManyNewSessions(sql, "203.0.113.9"), false);
  assert.deepEqual(calls[0].params, ["203.0.113.9"]);
});

test("new sessions are refused once the hourly limit is reached", async () => {
  const { sql } = sqlReturning(MAX_NEW_SESSIONS_PER_HOUR);
  assert.equal(await tooManyNewSessions(sql, "203.0.113.9"), true);
});

test("a request with no known IP is not limited or queried", async () => {
  const { sql, calls } = sqlReturning(MAX_NEW_SESSIONS_PER_HOUR);
  assert.equal(await tooManyNewSessions(sql, null), false);
  assert.equal(calls.length, 0);
});
