import assert from "node:assert/strict";
import { test } from "node:test";
import { meterPower, METER_PERIOD_MS, roundTo, turnAfter } from "../src/BenchGames/tossPutt.js";
import {
  CUPS,
  CUP_SPOTS,
  TABLE_LENGTH,
  applyThrow,
  cupWinner,
  cupsLeft,
  flyBall,
  mirror,
  newCupGame,
  readThrow,
  throwVelocity,
  thrower,
  writeThrow,
} from "../src/BenchGames/cupToss.js";
import {
  BALL_RADIUS,
  GAVE_UP_SCORE,
  HOLES,
  MAX_STROKES,
  applyStroke,
  golfTurn,
  golfWinner,
  insidePolygon,
  newGolfGame,
  puttVelocity,
  readStroke,
  rollBall,
  writeStroke,
} from "../src/BenchGames/miniGolf.js";
import { readPlayData } from "../src/BenchGames/protocol.js";

const noWobble = () => 0.5;
const allUp = Array(CUPS).fill(true);

test("the power meter rises to full and falls back again", () => {
  assert.equal(meterPower(0), 0);
  assert.equal(meterPower(METER_PERIOD_MS / 2), 1);
  assert.equal(meterPower(METER_PERIOD_MS / 4), 0.5);
  assert.equal(meterPower(METER_PERIOD_MS), 0);
  assert.equal(meterPower(-50), 0);
  assert.equal(roundTo(1.23456, 2), 1.23);
});

test("the one who invited throws first and the rematch swaps it", () => {
  assert.equal(turnAfter(0, 0), 0);
  assert.equal(turnAfter(1, 0), 1);
  assert.equal(turnAfter(0, 1), 1);
  assert.equal(thrower(newCupGame(), 1), 1);
});

test("the cups are a triangle that looks the same from either end", () => {
  assert.equal(CUP_SPOTS.length, CUPS);
  for (const spot of CUP_SPOTS) {
    const turned = mirror({ ...spot, y: 0 });
    assert.ok(turned.z < TABLE_LENGTH / 2, "the other end's cups are at this end");
    const back = mirror(turned);
    assert.ok(Math.abs(back.x - spot.x) < 1e-12 && Math.abs(back.z - spot.z) < 1e-12);
  }
});

test("a straight throw at the right strength lands in the front cup", () => {
  const shot = flyBall(throwVelocity(0, 0.44, noWobble), allUp);
  assert.equal(shot.cup, 0);
  // With that cup gone the same throw goes somewhere else
  assert.notEqual(flyBall(throwVelocity(0, 0.44, noWobble), [false, ...allUp.slice(1)]).cup, 0);
});

test("too soft or too hard misses, and the same throw always goes the same way", () => {
  assert.equal(flyBall(throwVelocity(0, 0.36, noWobble), allUp).cup, -1);
  assert.equal(flyBall(throwVelocity(0, 1, noWobble), allUp).cup, -1);
  assert.equal(flyBall(throwVelocity(0.14, 0.6, noWobble), allUp).cup, -1);
  const velocity = throwVelocity(0.03, 0.62);
  assert.deepEqual(flyBall(velocity, allUp), flyBall(velocity, allUp));
});

test("the wobble keeps a throw close to where it was aimed", () => {
  const plain = throwVelocity(0, 0.5, noWobble);
  const off = throwVelocity(0, 0.5, () => 1);
  assert.ok(off.vx > 0 && off.vx < 0.1);
  assert.ok(Math.abs(off.vz - plain.vz) < 0.1);
});

test("a hit takes the other's cup, and clearing all six wins", () => {
  let game = newCupGame();
  for (let i = 0; i < CUPS; i += 1) {
    assert.equal(cupWinner(game), null);
    // Player 0 sinks one each turn and player 1 misses
    game = applyThrow(game, 0, i);
    assert.equal(cupsLeft(game.cups[1]), CUPS - 1 - i);
    assert.deepEqual(game.last, { by: 0, cup: i });
    if (i < CUPS - 1) game = applyThrow(game, 0, -1);
  }
  assert.equal(cupWinner(game), 0);
  assert.equal(cupsLeft(game.cups[0]), CUPS);
});

test("a hit on a cup that's already gone counts as a miss", () => {
  const once = applyThrow(newCupGame(), 0, 2);
  const again = applyThrow(applyThrow(once, 0, -1), 0, 2);
  assert.equal(cupsLeft(again.cups[1]), CUPS - 1);
  assert.equal(again.last.cup, -1);
});

test("a throw message gets through the protocol and is read back", () => {
  const game = newCupGame();
  const data = writeThrow(0, throwVelocity(0.02, 0.6), 3);
  assert.deepEqual(readPlayData(data), data);
  assert.equal(readThrow(data, game).cup, 3);
  assert.equal(readThrow({ ...data, n: 1 }, game), null);
  assert.equal(readThrow({ ...data, cup: 6 }, game), null);
  assert.equal(readThrow({ ...data, cup: 1.5 }, game), null);
  assert.equal(readThrow({ ...data, vz: 500 }, game), null);
});

test("every hole has its tee and cup on the grass and clear of everything", () => {
  assert.equal(HOLES.length, 6);
  for (const hole of HOLES) {
    for (const spot of [hole.tee, hole.cup]) {
      assert.ok(insidePolygon(spot, hole.edge), hole.name);
      assert.ok(!hole.sand.some((patch) => insidePolygon(spot, patch)), hole.name);
      for (const bumper of hole.bumpers) {
        assert.ok(Math.hypot(spot.x - bumper.x, spot.y - bumper.y) > bumper.r + BALL_RADIUS);
      }
    }
  }
});

test("however hard it's hit, the ball stays on the course and comes to rest", () => {
  for (const hole of HOLES) {
    for (let turn = 0; turn < 24; turn += 1) {
      const end = rollBall(hole, hole.tee, puttVelocity((turn / 24) * Math.PI * 2, 1));
      assert.ok(insidePolygon(end, hole.edge), `${hole.name} at ${turn}`);
      assert.ok(end.frames.length > 1);
    }
  }
});

test("a gentle putt at the cup drops, and a full-power one skips over it", () => {
  const hole = HOLES[0];
  const angle = Math.atan2(hole.cup.y - hole.tee.y, hole.cup.x - hole.tee.x);
  const gentle = rollBall(hole, hole.tee, puttVelocity(angle, 0.7));
  assert.ok(gentle.holed);
  assert.deepEqual([gentle.x, gentle.y], [hole.cup.x, hole.cup.y]);
  assert.ok(!rollBall(hole, hole.tee, puttVelocity(angle, 1)).holed);
  assert.ok(!rollBall(hole, hole.tee, puttVelocity(angle, 0.3)).holed);
});

test("sand slows the ball down a lot", () => {
  const hole = HOLES[2];
  const through = rollBall(hole, hole.tee, puttVelocity(0, 0.5));
  const without = rollBall({ ...hole, sand: [] }, hole.tee, puttVelocity(0, 0.5));
  assert.ok(through.x < without.x - 20);
});

test("players take turns on a hole, and whoever's done sits out", () => {
  let game = newGolfGame();
  const miss = { x: 50, y: 50, holed: false };
  assert.equal(golfTurn(game, 0), 0);
  game = applyStroke(game, 0, miss);
  assert.equal(golfTurn(game, 0), 1);
  // Player 1 holes in one, so player 0 plays on alone
  game = applyStroke(game, 0, { x: 134, y: 54, holed: true });
  assert.equal(golfTurn(game, 0), 0);
  game = applyStroke(game, 0, miss);
  assert.equal(golfTurn(game, 0), 0);
  assert.equal(game.strokes, 3);
  // The rematch opens with the other player
  assert.equal(golfTurn(newGolfGame(), 1), 1);
});

test("a hole ends once both are done, then the next one opens with the other player", () => {
  let game = newGolfGame();
  const miss = { x: 50, y: 50, holed: false };
  game = applyStroke(game, 0, { ...miss, holed: true });
  for (let i = 0; i < MAX_STROKES; i += 1) game = applyStroke(game, 0, miss);
  assert.equal(game.hole, 1);
  assert.deepEqual(game.cards, [[1], [GAVE_UP_SCORE]]);
  assert.deepEqual(game.balls[0], { ...HOLES[1].tee, shots: 0, holed: false });
  assert.equal(golfTurn(game, 0), 1);
});

test("the lowest total after six holes wins", () => {
  let game = newGolfGame();
  for (let hole = 0; hole < HOLES.length; hole += 1) {
    const opener = golfTurn(game, 0);
    // Player 0 always takes two and player 1 always takes one
    while (game.hole === hole) {
      const by = golfTurn(game, 0);
      const shots = game.balls[by].shots;
      const holed = by === 0 ? shots === 1 : true;
      game = applyStroke(game, 0, { x: 50, y: 50, holed });
    }
    assert.notEqual(opener, null);
  }
  assert.equal(golfTurn(game, 0), null);
  assert.deepEqual(game.cards, [Array(6).fill(2), Array(6).fill(1)]);
  assert.equal(golfWinner(game), 1);
  assert.equal(golfWinner(newGolfGame()), null);
});

test("a stroke message gets through the protocol and is read back", () => {
  const game = newGolfGame();
  const end = rollBall(HOLES[0], HOLES[0].tee, puttVelocity(0.1, 0.4));
  const data = writeStroke(0, puttVelocity(0.1, 0.4), end);
  assert.deepEqual(readPlayData(data), data);
  assert.deepEqual(readStroke(data, game).end, { x: end.x, y: end.y, holed: end.holed });
  assert.equal(readStroke({ ...data, n: 3 }, game), null);
  assert.equal(readStroke({ ...data, holed: 2 }, game), null);
  assert.equal(readStroke({ ...data, x: -5 }, game), null);
  assert.equal(readStroke({ ...data, vx: 9999 }, game), null);
});
