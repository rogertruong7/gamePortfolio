import assert from "node:assert/strict";
import { test } from "node:test";
import { alternating, leader, pingPong, tenth, totals } from "../src/BenchGames/skillShots.js";
import {
  DROP,
  REGULATION,
  RINGS,
  SWEET,
  dartThrower,
  dartsResult,
  hitName,
  readDart,
  roundOf,
  scoreDart,
  throwDart,
  visitOf,
} from "../src/BenchGames/darts.js";
import {
  SHOTS,
  START,
  aimed,
  hoopFor,
  hoopsResult,
  launch,
  readShot,
  simulateShot,
} from "../src/BenchGames/hoops.js";
import {
  ARROWS,
  DRIFT,
  MAX_WIND,
  RING,
  TARGET,
  archeryResult,
  drawStrength,
  readArrow,
  ringScore,
  shootArrow,
  swayScale,
  windFor,
} from "../src/BenchGames/archery.js";
import { readPlayData } from "../src/BenchGames/protocol.js";

const still = () => 0.5;
const none = { x: 0, y: 0 };

test("the power meter goes up and comes back down", () => {
  assert.equal(pingPong(0, 1), 0);
  assert.equal(pingPong(0.5, 1), 0.5);
  assert.equal(pingPong(1, 1), 1);
  assert.equal(pingPong(1.25, 1), 0.75);
  assert.equal(pingPong(2, 1), 0);
  assert.equal(tenth(1.26), 1.3);
});

test("darts score like a real board", () => {
  assert.deepEqual(scoreDart(0, 0), { pts: 50, hit: "bull" });
  assert.deepEqual(scoreDart(10, 0), { pts: 25, hit: "outer" });
  // Straight up is 20, straight right 6, straight down 3 and straight left 11
  assert.deepEqual(scoreDart(0, -103), { pts: 60, hit: "t20" });
  assert.deepEqual(scoreDart(0, -166), { pts: 40, hit: "d20" });
  assert.deepEqual(scoreDart(0, -50), { pts: 20, hit: "s20" });
  assert.deepEqual(scoreDart(130, 0), { pts: 6, hit: "s6" });
  assert.deepEqual(scoreDart(0, 103), { pts: 9, hit: "t3" });
  assert.deepEqual(scoreDart(-166, 0), { pts: 22, hit: "d11" });
  assert.deepEqual(scoreDart(0, -RINGS.doubleOut - 1), { pts: 0, hit: "miss" });
  // Just clockwise of the 20's edge is the 1
  const edge = (Math.PI * 2) / 40 + 0.01;
  assert.equal(scoreDart(Math.sin(edge) * 60, -Math.cos(edge) * 60).hit, "s1");
  assert.equal(hitName("t20"), "Treble 20");
  assert.equal(hitName("bull"), "Bullseye");
});

test("a dart lands where it's aimed at the sweet spot, and low or high off it", () => {
  const aim = { x: 0, y: -103 };
  assert.deepEqual(throwDart({ aim, wobble: none, power: SWEET, random: still }), {
    x: 0,
    y: -103,
    pts: 60,
    hit: "t20",
  });
  const soft = throwDart({ aim, wobble: none, power: SWEET - 0.1, random: still });
  assert.equal(soft.y, tenth(-103 + 0.1 * DROP));
  const hard = throwDart({ aim, wobble: { x: 0, y: -5 }, power: SWEET + 0.1, random: still });
  assert.ok(hard.y < -103);
});

test("darts go three a turn for three rounds, then one each in sudden death", () => {
  assert.deepEqual(
    Array.from({ length: 7 }, (_, n) => dartThrower(n, 0)),
    [0, 0, 0, 1, 1, 1, 0]
  );
  assert.equal(dartThrower(0, 1), 1);
  assert.equal(dartThrower(REGULATION, 0), 0);
  assert.equal(dartThrower(REGULATION + 1, 0), 1);
  assert.equal(dartThrower(REGULATION, 1), 1);
  assert.equal(roundOf(5), 0);
  assert.equal(roundOf(6), 1);
  assert.equal(roundOf(REGULATION), 3);
  assert.equal(visitOf(2), visitOf(0));
  assert.notEqual(visitOf(3), visitOf(2));
});

const dartsGame = (points, match = 0) =>
  points.map((pts, n) => ({ player: dartThrower(n, match), pts }));

test("the higher total after three rounds wins, and a tie goes to sudden death", () => {
  const regulation = Array(REGULATION).fill(20);
  assert.equal(dartsResult(dartsGame(regulation.slice(0, 17))).over, false);
  const tied = dartsResult(dartsGame(regulation));
  assert.equal(tied.over, false);
  assert.equal(tied.sudden, true);
  assert.deepEqual(tied.totals, [180, 180]);

  const won = [...regulation];
  won[0] = 60;
  assert.equal(dartsResult(dartsGame(won)).winner, 0);

  // Level single darts go on, and the first pair that differs settles it
  assert.equal(dartsResult(dartsGame([...regulation, 25, 25])).over, false);
  const settled = dartsResult(dartsGame([...regulation, 25, 25, 3, 50]));
  assert.equal(settled.over, true);
  assert.equal(settled.winner, 1);
  // Totals are the three rounds only
  assert.deepEqual(settled.totals, [180, 180]);
});

test("a dart from the other player only counts if it adds up", () => {
  assert.deepEqual(readDart({ n: 0, x: 0, y: -103, pts: 60, hit: "t20", ax: 0 }), {
    x: 0,
    y: -103,
    pts: 60,
    hit: "t20",
  });
  assert.equal(readDart({ n: 0, x: 0, y: 0, pts: 60, hit: "bull" }), null);
  assert.equal(readDart({ n: 0, x: 0, y: 0, pts: 63, hit: "t21" }), null);
  assert.equal(readDart({ n: -1, x: 0, y: 0, pts: 50, hit: "bull" }), null);
  assert.equal(readDart({ n: 0, x: 1e5, y: 0, pts: 0, hit: "miss" }), null);
});

// Looks for a shot at this hoop that scores, so the tests don't depend on hand-picked numbers
function findShot(hoop, wanted) {
  for (let vx = 150; vx <= 700; vx += 5) {
    for (let vy = -900; vy <= -300; vy += 5) {
      if (simulateShot(hoop, vx, vy).pts === wanted) return { vx, vy };
    }
  }
  return null;
}

test("the hoop moves each pair of shots but is the same from the same seed", () => {
  assert.deepEqual(hoopFor(42, 3), hoopFor(42, 3));
  const spots = new Set(Array.from({ length: 10 }, (_, pair) => JSON.stringify(hoopFor(42, pair))));
  assert.ok(spots.size > 5);
  for (let pair = 0; pair < 20; pair += 1) {
    const hoop = hoopFor(pair * 1000, pair);
    assert.ok(hoop.front.x > START.x + 100 && hoop.board.x < 460);
    assert.ok(hoop.y > 100 && hoop.y < 260);
  }
});

test("hoops scores 3 for a swish, 2 off the rim or board, and 0 for a miss", () => {
  const hoop = hoopFor(1234, 0);
  const swish = findShot(hoop, 3);
  const bank = findShot(hoop, 2);
  assert.ok(swish && bank);
  assert.deepEqual(simulateShot(hoop, swish.vx, swish.vy).swish, true);
  assert.deepEqual(simulateShot(hoop, bank.vx, bank.vy).made, true);
  // Straight along the floor never goes in
  const rolled = simulateShot(hoop, 300, 0);
  assert.equal(rolled.pts, 0);
  // The same two numbers fly the same path
  assert.deepEqual(simulateShot(hoop, swish.vx, swish.vy), simulateShot(hoop, swish.vx, swish.vy));
});

test("a slingshot pull shoots the other way, kept to a tenth", () => {
  const shot = launch(-50, 50, still);
  assert.ok(shot.vx > 0 && shot.vy < 0);
  assert.ok(Math.abs(shot.vx + shot.vy) < 1);
  const up = launch(0, 80, still);
  assert.ok(Math.abs(up.vx) < 0.1 && up.vy < 0);
  assert.equal(shot.vx, tenth(shot.vx));
  assert.deepEqual(launch(0, 0), { vx: 0, vy: 0 });
  const flat = aimed(0, 500, still);
  assert.deepEqual(flat, { vx: 500, vy: -0 });
});

test("hoops is ten shots each and can be drawn", () => {
  const shots = Array.from({ length: SHOTS }, (_, n) => ({ player: alternating(n, 0), pts: 2 }));
  assert.equal(hoopsResult(shots.slice(0, SHOTS - 1)).over, false);
  assert.deepEqual(hoopsResult(shots), { over: true, winner: null, totals: [20, 20] });
  shots[0].pts = 3;
  assert.equal(hoopsResult(shots).winner, 0);
  assert.deepEqual(readShot({ n: 3, vx: 400, vy: -600, pts: 3 }), { vx: 400, vy: -600, pts: 3 });
  assert.equal(readShot({ n: 3, vx: 400, vy: -600, pts: 1 }), null);
  assert.equal(readShot({ n: 3, vx: "fast", vy: -600, pts: 2 }), null);
});

test("archery rings score 10 in the middle down to 1 at the edge", () => {
  assert.equal(ringScore(TARGET.x, TARGET.y), 10);
  assert.equal(ringScore(TARGET.x + RING * 0.5, TARGET.y), 10);
  assert.equal(ringScore(TARGET.x + RING * 1.5, TARGET.y), 9);
  assert.equal(ringScore(TARGET.x, TARGET.y + RING * 9.5), 1);
  assert.equal(ringScore(TARGET.x + TARGET.radius + 1, TARGET.y), 0);
});

test("wind pushes the arrow and an early release drops it", () => {
  const aim = { x: TARGET.x, y: TARGET.y };
  assert.equal(shootArrow({ aim, wobble: none, draw: 1, wind: 0 }).pts, 10);
  const blown = shootArrow({ aim, wobble: none, draw: 1, wind: 2 });
  assert.equal(blown.x, TARGET.x + 2 * DRIFT);
  // Aiming into the wind brings it back
  const into = { x: TARGET.x - 2 * DRIFT, y: TARGET.y };
  assert.equal(shootArrow({ aim: into, wobble: none, draw: 1, wind: 2 }).pts, 10);
  assert.ok(shootArrow({ aim, wobble: none, draw: 0.5, wind: 0 }).y > TARGET.y);
  assert.equal(drawStrength(0), 0);
  assert.equal(drawStrength(5), 1);
});

test("holding the draw steadies the aim, then tires it", () => {
  assert.equal(swayScale(0), 1);
  assert.ok(swayScale(2) < swayScale(0.3));
  assert.ok(swayScale(6) > swayScale(2));
});

test("the wind is the same from the same seed and within its limits", () => {
  assert.equal(windFor(77, 2), windFor(77, 2));
  for (let pair = 0; pair < 50; pair += 1) {
    const wind = windFor(123456, pair);
    assert.ok(Math.abs(wind) <= MAX_WIND);
    assert.equal(wind * 2, Math.round(wind * 2));
  }
});

test("archery is six arrows each, highest total wins", () => {
  const arrows = Array.from({ length: ARROWS }, (_, n) => ({ player: alternating(n, 1), pts: 7 }));
  arrows[1].pts = 10;
  // In a rematch the other player shoots first, so the second arrow is the inviter's
  assert.equal(archeryResult(arrows).winner, 0);
  assert.equal(archeryResult(arrows.slice(0, 5)).over, false);
  assert.equal(readArrow({ n: 0, x: 1, y: 2, pts: 11 }), null);
  assert.deepEqual(readArrow({ n: 0, x: 1, y: 2, pts: 0 }), { x: 1, y: 2, pts: 0 });
});

test("totals and leader count each player's points", () => {
  assert.deepEqual(totals([{ player: 1, pts: 5 }, { player: 0, pts: 2 }]), [2, 5]);
  assert.equal(leader([3, 3]), null);
  assert.equal(leader([1, 3]), 1);
});

test("every message the three games send gets through the protocol's checks", () => {
  const messages = [
    { seed: 999999 },
    { n: 17, ax: -12.3, ay: 40.1, pw: 0.751, x: -10.2, y: 44.4, pts: 3, hit: "s3" },
    { n: 19, vx: 412.5, vy: -688.1, pts: 3 },
    { n: 11, ax: 210.4, ay: 160, dr: 1, x: 226.4, y: 171.2, pts: 10 },
  ];
  for (const data of messages) assert.deepEqual(readPlayData(data), data);
});
