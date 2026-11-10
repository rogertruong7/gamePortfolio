import { clamp, finiteIn, roundTo, turnAfter } from "../../shared/tossPutt.js";

// Cup Toss: each player has six cups in a triangle at their end of a table, and they take turns
// tossing one ball at the other's. A ball that lands in a cup takes it away, and the first to clear
// all six of the other's wins.
//
// Everything is in metres, seen from the thrower's end: x runs left to right across the table, y
// is up from the tabletop, and z runs away from the thrower down the table. The other player's
// view is the same table turned round, so a point there is mirror() of the point here.

export const TABLE_LENGTH = 1.9;
export const TABLE_WIDTH = 0.62;
export const CUP_HEIGHT = 0.12;
export const CUP_RIM = 0.05;
export const CUP_BASE = 0.034;
export const BALL_RADIUS = 0.02;
export const CUPS = 6;
const GRAVITY = 9.8;

// Where the ball leaves the hand: just behind the near edge, a little above the table
export const RELEASE = { x: 0, y: 0.3, z: -0.08 };
const LAUNCH_ANGLE = 0.62;

// The furthest a throw can go to the side, in radians either way
export const MAX_AIM = 0.14;
// Power 0 lands this far away at cup height and power 1 this far, in a straight line between
const SHORTEST = 1.2;
const LONGEST = 2.4;
// A throw is never quite where it was aimed, so the same flick twice doesn't always score
const AIM_WOBBLE = 0.008;
const POWER_WOBBLE = 0.006;

// The six cups at the far end, front to back: 0 is the point of the triangle nearest the thrower,
// 1 and 2 the middle row from left to right, then 3, 4 and 5 along the back
const GAP = CUP_RIM * 2 + 0.004;
const ROW = (GAP * Math.sqrt(3)) / 2;
const BACK = TABLE_LENGTH - CUP_RIM - 0.03;
export const CUP_SPOTS = [
  { x: 0, z: BACK - 2 * ROW },
  { x: -GAP / 2, z: BACK - ROW },
  { x: GAP / 2, z: BACK - ROW },
  { x: -GAP, z: BACK },
  { x: 0, z: BACK },
  { x: GAP, z: BACK },
];

// The same point seen from the other end of the table
export const mirror = ({ x, y, z }) => ({ x: -x, y, z: TABLE_LENGTH - z });

// The speed to throw at so it comes down to cup height after travelling distance across the table
function launchSpeed(distance) {
  const drop = RELEASE.y - CUP_HEIGHT;
  const cos = Math.cos(LAUNCH_ANGLE);
  return Math.sqrt(
    (GRAVITY * distance * distance) / (2 * cos * cos * (distance * Math.tan(LAUNCH_ANGLE) + drop))
  );
}

// aim is the angle to the side, and power from 0 to 1 sets how far. random gives the wobble
// (pass () => 0.5 for none). The velocity comes back cut to four places, ready to send.
export function throwVelocity(aim, power, random = Math.random) {
  const side = clamp(aim, -MAX_AIM, MAX_AIM) + (random() * 2 - 1) * AIM_WOBBLE;
  const far = clamp(power, 0, 1) + (random() * 2 - 1) * POWER_WOBBLE;
  const speed = launchSpeed(SHORTEST + clamp(far, 0, 1) * (LONGEST - SHORTEST));
  const flat = speed * Math.cos(LAUNCH_ANGLE);
  return {
    vx: roundTo(flat * Math.sin(side)),
    vy: roundTo(speed * Math.sin(LAUNCH_ANGLE)),
    vz: roundTo(flat * Math.cos(side)),
  };
}

// How wide a cup is at height y, as its sides slope in towards the bottom
const cupRadiusAt = (y) => CUP_BASE + ((CUP_RIM - CUP_BASE) * clamp(y, 0, CUP_HEIGHT)) / CUP_HEIGHT;

const STEP = 1 / 240;
// Every other step is kept for the replay, so it plays back at 120 frames a second
export const FRAMES_PER_SECOND = 120;
const MAX_SECONDS = 3;
const TABLE_BOUNCE = 0.55;
const TABLE_GRIP = 0.85;
const ROLLING_DRAG = 0.9;
const FLOOR = -0.7;

// Sends a ball off the side of a cup it ran into, losing some of its speed
function bounceOffCup(ball, cup, distance, damping) {
  const nx = (ball.x - cup.x) / (distance || 1);
  const nz = (ball.z - cup.z) / (distance || 1);
  const towards = ball.vx * nx + ball.vz * nz;
  if (towards < 0) {
    ball.vx -= 2 * towards * nx;
    ball.vz -= 2 * towards * nz;
  }
  ball.vx *= damping;
  ball.vz *= damping;
  return { nx, nz };
}

// Flies a ball thrown with velocity { vx, vy, vz } down the table at the cups still standing
// (standing[i] is cup i's, in CUP_SPOTS). Returns where it went, as [x, y, z] frames for the
// replay, and cup, the one it landed in or -1 for a miss. It's only plain sums, so the same throw
// comes out the same on both screens.
export function flyBall({ vx, vy, vz }, standing) {
  const ball = { ...RELEASE, vx, vy, vz };
  const frames = [[ball.x, ball.y, ball.z]];
  const cups = CUP_SPOTS.map((spot, i) => ({ ...spot, i })).filter(({ i }) => standing[i]);
  let rolling = false;

  for (let step = 1; step <= MAX_SECONDS / STEP; step += 1) {
    const before = ball.y;
    if (!rolling) ball.vy -= GRAVITY * STEP;
    ball.x += ball.vx * STEP;
    ball.y += ball.vy * STEP;
    ball.z += ball.vz * STEP;

    for (const cup of cups) {
      const distance = Math.hypot(ball.x - cup.x, ball.z - cup.z);
      if (before >= CUP_HEIGHT && ball.y < CUP_HEIGHT) {
        // Coming down through the top of a cup: well inside the rim it's in, and on the rim it
        // pops back up and away
        if (distance < CUP_RIM - BALL_RADIUS * 0.5) {
          frames.push([cup.x, CUP_HEIGHT * 0.6, cup.z]);
          return { frames, cup: cup.i };
        }
        if (distance < CUP_RIM + BALL_RADIUS) {
          bounceOffCup(ball, cup, distance, 0.6);
          ball.y = CUP_HEIGHT;
          ball.vy = Math.abs(ball.vy) * 0.45;
          rolling = false;
        }
      } else if (ball.y < CUP_HEIGHT && ball.y > -BALL_RADIUS) {
        const reach = cupRadiusAt(ball.y) + BALL_RADIUS;
        if (distance < reach) {
          const { nx, nz } = bounceOffCup(ball, cup, distance, 0.5);
          ball.x = cup.x + nx * reach;
          ball.z = cup.z + nz * reach;
        }
      }
    }

    const onTable =
      Math.abs(ball.x) <= TABLE_WIDTH / 2 && ball.z >= 0 && ball.z <= TABLE_LENGTH;
    if (onTable && ball.y < BALL_RADIUS && before >= BALL_RADIUS - 0.001) {
      ball.y = BALL_RADIUS;
      if (rolling || Math.abs(ball.vy) < 0.4) {
        rolling = true;
        ball.vy = 0;
      } else {
        ball.vy = -ball.vy * TABLE_BOUNCE;
        ball.vx *= TABLE_GRIP;
        ball.vz *= TABLE_GRIP;
      }
    }
    if (rolling) {
      if (!onTable) {
        rolling = false;
      } else {
        const speed = Math.hypot(ball.vx, ball.vz);
        const slower = Math.max(0, speed - ROLLING_DRAG * STEP);
        ball.vx = speed ? (ball.vx * slower) / speed : 0;
        ball.vz = speed ? (ball.vz * slower) / speed : 0;
        if (slower < 0.03) {
          frames.push([ball.x, ball.y, ball.z]);
          break;
        }
      }
    }

    if (step % 2 === 0) frames.push([ball.x, ball.y, ball.z]);
    if (ball.y < FLOOR) break;
  }
  return { frames, cup: -1 };
}

// The game itself. cups[p] says which of player p's cups are still up, and throws counts the
// throws so far, which is also the number the next one is sent with.
export const newCupGame = () => ({
  cups: [Array(CUPS).fill(true), Array(CUPS).fill(true)],
  throws: 0,
  last: null,
});

export const thrower = (game, match) => turnAfter(game.throws, match);
export const cupsLeft = (cups) => cups.filter(Boolean).length;

// Whoever has cleared all the other's cups, or null while both still have some
export function cupWinner(game) {
  if (!cupsLeft(game.cups[1])) return 0;
  if (!cupsLeft(game.cups[0])) return 1;
  return null;
}

// The throw just made by whoever's turn it was, landing in cup (of the other's) or -1
export function applyThrow(game, match, cup) {
  const by = thrower(game, match);
  const target = 1 - by;
  const hit = cup >= 0 && game.cups[target][cup] ? cup : -1;
  const cups = game.cups.map((row, p) => (p === target ? row.map((up, i) => up && i !== hit) : row));
  return { cups, throws: game.throws + 1, last: { by, cup: hit } };
}

// What goes over the wire for one throw
export const writeThrow = (throws, velocity, cup) => ({ n: throws, ...velocity, cup });

// A throw from the other player, or null if it isn't the next one or doesn't make sense
export function readThrow(data, game) {
  if (!data || data.n !== game.throws) return null;
  const { vx, vy, vz, cup } = data;
  if (!finiteIn(vx, 20) || !finiteIn(vy, 20) || !finiteIn(vz, 20)) return null;
  if (!Number.isInteger(cup) || cup < -1 || cup >= CUPS) return null;
  return { velocity: { vx, vy, vz }, cup };
}
