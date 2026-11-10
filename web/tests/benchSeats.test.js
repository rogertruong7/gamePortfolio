import assert from "node:assert/strict";
import { test } from "node:test";
import { benchIsFull, seatAlong } from "../src/Game/benches/benchSeats.js";

const claim = (id, bench, since) => ({ id, bench, since });

test("someone on their own sits in the middle", () => {
  assert.equal(seatAlong(claim("me", 0, 10), []), 0);
  assert.equal(seatAlong(claim("me", 0, 10), [claim("other", 1, 5)]), 0);
});

test("two share a bench, one at each end", () => {
  const first = claim("a", 0, 5);
  const second = claim("b", 0, 9);
  const firstSeat = seatAlong(first, [second]);
  const secondSeat = seatAlong(second, [first]);
  assert.ok(firstSeat !== 0 && secondSeat !== 0);
  assert.equal(firstSeat, -secondSeat);
});

test("both work out the same ends, whichever asks", () => {
  const a = claim("a", 0, 7);
  const b = claim("b", 0, 7);
  assert.equal(seatAlong(a, [b]), -seatAlong(b, [a]));
});

test("a third person has nowhere to sit", () => {
  const others = [claim("a", 0, 1), claim("b", 0, 2)];
  assert.equal(seatAlong(claim("me", 0, 3), others), null);
  assert.ok(benchIsFull(0, others));
  assert.ok(!benchIsFull(1, others));
});

test("of three arriving, the last one gives up its place", () => {
  const everyone = [claim("a", 0, 1), claim("b", 0, 2), claim("c", 0, 3)];
  const seats = everyone.map((me) => seatAlong(me, everyone));
  assert.equal(seats.filter((seat) => seat === null).length, 1);
  assert.equal(seats[2], null);
});
