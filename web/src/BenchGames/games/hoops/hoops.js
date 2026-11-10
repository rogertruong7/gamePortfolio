import { seededRandom } from "../../shared/random.js";
import { alternating, clamp, isCount, isNumber, leader, tenth, totals } from "../../shared/skillShots.js";

// A side view of a hoop, in units about a centimetre each, with x to the right and y down. The ball
// is shot from the left and the hoop sits somewhere on the right, moved for every pair of shots.
export const WORLD = { width: 460, height: 400 };
export const BALL_RADIUS = 12;
export const START = { x: 70, y: 300 };
export const FLOOR = 384;
export const RIM_RADIUS = 3;
export const RIM_WIDTH = 56;
const BOARD_GAP = 10;
const BOARD_ABOVE = 90;
const BOARD_BELOW = 12;
const GRAVITY = 900;
// How much of its speed the ball keeps off the rim and board, and off the floor
const BOUNCE = 0.55;
const FLOOR_BOUNCE = 0.5;

// Small steps so a fast ball can't jump through the rim between two of them, and every fourth
// one kept for drawing at 60 frames a second
const STEP = 1 / 240;
const STEPS_PER_FRAME = 4;
export const FRAME_SECONDS = STEP * STEPS_PER_FRAME;
const LONGEST = 3;

export const SHOTS_EACH = 10;
export const SHOTS = SHOTS_EACH * 2;
export const MAX_SPEED = 950;
export const MIN_SPEED = 250;
// A slingshot pull of this many units shoots at this many units a second per unit pulled
export const PULL_POWER = 6.5;
// A shot is never quite what was pulled, so the same pull twice doesn't always go in
const SPEED_WOBBLE = 0.015;
const ANGLE_WOBBLE = 0.018;

export const shooter = alternating;

// Both players' kth shots share a hoop, so neither gets the easy ones
export const pairOf = (n) => Math.floor(n / 2);

export function hoopFor(seed, pair) {
  const random = seededRandom(seed + pair * 7919);
  const x = Math.round(250 + random() * 90);
  const y = Math.round(140 + random() * 95);
  const boardX = x + RIM_WIDTH + BOARD_GAP;
  return {
    y,
    front: { x, y },
    back: { x: x + RIM_WIDTH, y },
    board: { x: boardX, top: y - BOARD_ABOVE, bottom: y + BOARD_BELOW },
  };
}

// The launch velocity for a pull back of (dx, dy) from where the finger went down, slingshot
// style: pulling down and left shoots up and right. random adds the wobble.
export function launch(dx, dy, random = Math.random) {
  const pull = Math.hypot(dx, dy);
  if (pull === 0) return { vx: 0, vy: 0 };
  const speed = clamp(pull * PULL_POWER, MIN_SPEED, MAX_SPEED);
  return aimed(Math.atan2(dy, -dx), speed, random);
}

// The same from an angle (radians, up from flat) and speed, as the keyboard sets them
export function aimed(angle, speed, random = Math.random) {
  const turn = angle + (random() * 2 - 1) * ANGLE_WOBBLE;
  const fast = clamp(speed, MIN_SPEED, MAX_SPEED) * (1 + (random() * 2 - 1) * SPEED_WOBBLE);
  return { vx: tenth(Math.cos(turn) * fast), vy: tenth(-Math.sin(turn) * fast) };
}

// Pushes the ball out of a point it overlaps (a rim edge or the nearest bit of the backboard) and
// bounces it off. Says whether they touched.
function bounceOff(ball, px, py, reach) {
  const dx = ball.x - px;
  const dy = ball.y - py;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance >= reach || distance === 0) return false;
  const nx = dx / distance;
  const ny = dy / distance;
  ball.x = px + nx * reach;
  ball.y = py + ny * reach;
  const along = ball.vx * nx + ball.vy * ny;
  if (along < 0) {
    ball.vx -= (1 + BOUNCE) * along * nx;
    ball.vy -= (1 + BOUNCE) * along * ny;
  }
  return true;
}

// Flies the shot and says how it went. Only adding, multiplying and square roots, which come out
// the same in every browser, so both screens draw the same flight from the same two numbers.
// path is the ball's place every frame as [x0, y0, x1, y1, …].
export function simulateShot(hoop, vx, vy) {
  const ball = { x: START.x, y: START.y, vx, vy };
  const { front, back, board } = hoop;
  const reach = BALL_RADIUS + RIM_RADIUS;
  const path = [ball.x, ball.y];
  let touched = false;
  let made = false;
  let swish = false;

  for (let step = 1; step <= LONGEST / STEP; step += 1) {
    const above = ball.y < hoop.y;
    ball.vy += GRAVITY * STEP;
    ball.x += ball.vx * STEP;
    ball.y += ball.vy * STEP;

    const between = ball.x > front.x && ball.x < back.x;
    if (!made && above && ball.y >= hoop.y && between) {
      made = true;
      swish = !touched;
    } else if (!above && ball.y < hoop.y && between) {
      // Coming up through the hoop from underneath is the net in the way
      ball.y = hoop.y + 1;
      ball.vy = Math.abs(ball.vy) * 0.2;
      touched = true;
    }

    if (bounceOff(ball, front.x, front.y, reach)) touched = true;
    if (bounceOff(ball, back.x, back.y, reach)) touched = true;
    const boardY = Math.min(board.bottom, Math.max(board.top, ball.y));
    if (bounceOff(ball, board.x, boardY, BALL_RADIUS + 2)) touched = true;

    const resting = FLOOR - BALL_RADIUS;
    if (ball.y > resting) {
      ball.y = resting;
      if (ball.vy > 0) ball.vy = -ball.vy * FLOOR_BOUNCE;
      ball.vx *= 0.8;
    }

    if (step % STEPS_PER_FRAME === 0) path.push(ball.x, ball.y);
    const gone = ball.x < -BALL_RADIUS * 3 || ball.x > WORLD.width + BALL_RADIUS * 3;
    const stopped = ball.y >= resting && Math.abs(ball.vy) < 40 && Math.abs(ball.vx) < 15;
    if (gone || stopped) break;
  }

  return { made, swish, pts: made ? (swish ? 3 : 2) : 0, path };
}

// throws are [{ player, pts }] in the order shot
export function hoopsResult(throws) {
  const sums = totals(throws);
  const over = throws.length >= SHOTS;
  return { over, winner: over ? leader(sums) : null, totals: sums };
}

// The other player's shot, or null if it doesn't make sense. Their points are kept as sent.
export function readShot(data) {
  const { n, vx, vy, pts } = data;
  if (!isCount(n) || !isNumber(vx, MAX_SPEED * 2) || !isNumber(vy, MAX_SPEED * 2)) return null;
  if (![0, 2, 3].includes(pts)) return null;
  return { vx, vy, pts };
}
