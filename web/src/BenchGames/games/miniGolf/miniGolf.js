import { clamp, finiteIn, roundTo } from "../../shared/tossPutt.js";

// Mini Golf: six short holes seen from above. Both players play the same hole, taking turns, until
// both have holed out or used all their strokes, and the lowest total over the six wins.
//
// Each hole sits in a box COURSE_WIDTH by COURSE_HEIGHT, with y going down. edge is the wall all
// the way round (it closes itself), walls are extra wall segments inside it, bumpers are round
// posts that kick the ball away, and sand is patches that slow it right down.

export const COURSE_WIDTH = 160;
export const COURSE_HEIGHT = 100;
export const BALL_RADIUS = 2;
export const CUP_RADIUS = 3.6;
export const MAX_STROKES = 6;
// What a hole scores for someone who used all their strokes without getting it in
export const GAVE_UP_SCORE = MAX_STROKES + 1;

export const HOLES = [
  {
    name: "Warm-up",
    edge: [
      [10, 28],
      [150, 28],
      [150, 72],
      [10, 72],
    ],
    walls: [],
    bumpers: [{ x: 84, y: 44, r: 5 }],
    sand: [],
    tee: { x: 24, y: 50 },
    cup: { x: 134, y: 54 },
  },
  {
    name: "Dog-leg",
    edge: [
      [14, 10],
      [58, 10],
      [58, 54],
      [150, 54],
      [150, 92],
      [32, 92],
      [14, 74],
    ],
    // A bank across the inside of the corner to roll the ball round it
    walls: [[[58, 54], [70, 66]]],
    bumpers: [],
    sand: [],
    tee: { x: 36, y: 22 },
    cup: { x: 134, y: 74 },
  },
  {
    name: "Beach",
    edge: [
      [10, 18],
      [150, 18],
      [150, 82],
      [10, 82],
    ],
    walls: [],
    bumpers: [],
    sand: [
      [
        [62, 30],
        [96, 26],
        [104, 58],
        [70, 70],
        [56, 52],
      ],
      [
        [112, 66],
        [132, 64],
        [128, 82],
        [110, 82],
      ],
    ],
    tee: { x: 24, y: 50 },
    cup: { x: 136, y: 40 },
  },
  {
    name: "Zigzag",
    edge: [
      [10, 10],
      [150, 10],
      [150, 90],
      [10, 90],
    ],
    walls: [
      [
        [56, 10],
        [56, 62],
      ],
      [
        [104, 90],
        [104, 38],
      ],
    ],
    bumpers: [],
    sand: [],
    tee: { x: 30, y: 26 },
    cup: { x: 130, y: 74 },
  },
  {
    name: "Pinball",
    edge: [
      [30, 10],
      [130, 10],
      [150, 30],
      [150, 70],
      [130, 90],
      [30, 90],
      [10, 70],
      [10, 30],
    ],
    walls: [],
    bumpers: [
      { x: 62, y: 34, r: 5 },
      { x: 62, y: 66, r: 5 },
      { x: 90, y: 50, r: 6 },
      { x: 114, y: 30, r: 4 },
      { x: 114, y: 70, r: 4 },
    ],
    sand: [],
    tee: { x: 24, y: 50 },
    cup: { x: 136, y: 50 },
  },
  {
    name: "Funnel",
    edge: [
      [10, 40],
      [40, 14],
      [120, 14],
      [150, 50],
      [120, 86],
      [40, 86],
      [10, 60],
    ],
    walls: [
      [
        [98, 30],
        [120, 43],
      ],
      [
        [98, 70],
        [120, 57],
      ],
    ],
    bumpers: [{ x: 70, y: 50, r: 4 }],
    sand: [
      [
        [52, 22],
        [86, 22],
        [80, 36],
        [56, 36],
      ],
      [
        [56, 64],
        [80, 64],
        [86, 78],
        [52, 78],
      ],
    ],
    tee: { x: 24, y: 50 },
    cup: { x: 138, y: 50 },
  },
];

// Every wall of a hole as [[x1, y1], [x2, y2]] segments
export function wallsOf(hole) {
  const round = hole.edge.map((point, i) => [point, hole.edge[(i + 1) % hole.edge.length]]);
  return [...round, ...hole.walls];
}

// Whether a point is inside a polygon, by counting how many of its sides a line out to the right
// crosses
export function insidePolygon({ x, y }, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The fastest a putt can go, in course units a second, and how quickly it slows on grass and sand
export const MAX_SPEED = 170;
const GRASS_DRAG = 46;
const SAND_DRAG = 260;
const WALL_BOUNCE = 0.72;
const BUMPER_KICK = 1.15;
// Rolling over the cup slower than this and it drops in. Any faster and it skips over the top.
const DROPS_BELOW = 80;
const STOPS_BELOW = 1.5;
const STEP = 1 / 120;
export const FRAMES_PER_SECOND = 120;
const MAX_SECONDS = 20;

// Pushes the ball back out of a wall it's sunk into and bounces it off. The step is short enough
// that even a full-power putt moves less than the ball's width, so it can't skip through a wall.
function hitWall(ball, [[x1, y1], [x2, y2]]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const along = clamp(((ball.x - x1) * dx + (ball.y - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const nearX = x1 + dx * along;
  const nearY = y1 + dy * along;
  const distance = Math.hypot(ball.x - nearX, ball.y - nearY);
  if (distance >= BALL_RADIUS || distance === 0) return;
  const nx = (ball.x - nearX) / distance;
  const ny = (ball.y - nearY) / distance;
  ball.x = nearX + nx * BALL_RADIUS;
  ball.y = nearY + ny * BALL_RADIUS;
  const into = ball.vx * nx + ball.vy * ny;
  if (into < 0) {
    ball.vx -= (1 + WALL_BOUNCE) * into * nx;
    ball.vy -= (1 + WALL_BOUNCE) * into * ny;
  }
}

function hitBumper(ball, bumper) {
  const reach = bumper.r + BALL_RADIUS;
  const distance = Math.hypot(ball.x - bumper.x, ball.y - bumper.y);
  if (distance >= reach || distance === 0) return;
  const nx = (ball.x - bumper.x) / distance;
  const ny = (ball.y - bumper.y) / distance;
  ball.x = bumper.x + nx * reach;
  ball.y = bumper.y + ny * reach;
  const into = ball.vx * nx + ball.vy * ny;
  if (into < 0) {
    ball.vx -= (1 + BUMPER_KICK) * into * nx;
    ball.vy -= (1 + BUMPER_KICK) * into * ny;
  }
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx *= MAX_SPEED / speed;
    ball.vy *= MAX_SPEED / speed;
  }
}

// The velocity for a putt at angle (radians, 0 is to the right, y down) and power from 0 to 1,
// cut to three places ready to send
export const puttVelocity = (angle, power) => {
  const speed = clamp(power, 0, 1) * MAX_SPEED;
  return { vx: roundTo(Math.cos(angle) * speed, 3), vy: roundTo(Math.sin(angle) * speed, 3) };
};

// Rolls a ball from start with velocity { vx, vy } until it stops or drops. Returns its [x, y]
// frames for the replay, where it ended up (cut to three places, as it's sent), and holed. It's
// only plain sums, so the same putt comes out the same on both screens.
export function rollBall(hole, start, { vx, vy }) {
  const ball = { x: start.x, y: start.y, vx, vy };
  const walls = wallsOf(hole);
  const frames = [[ball.x, ball.y]];
  let holed = false;

  for (let step = 0; step < MAX_SECONDS / STEP; step += 1) {
    ball.x += ball.vx * STEP;
    ball.y += ball.vy * STEP;
    walls.forEach((wall) => hitWall(ball, wall));
    hole.bumpers.forEach((bumper) => hitBumper(ball, bumper));

    const speed = Math.hypot(ball.vx, ball.vy);
    if (Math.hypot(ball.x - hole.cup.x, ball.y - hole.cup.y) < CUP_RADIUS && speed < DROPS_BELOW) {
      holed = true;
      ball.x = hole.cup.x;
      ball.y = hole.cup.y;
      frames.push([ball.x, ball.y]);
      break;
    }

    const drag = hole.sand.some((patch) => insidePolygon(ball, patch)) ? SAND_DRAG : GRASS_DRAG;
    const slower = Math.max(0, speed - drag * STEP);
    if (slower < STOPS_BELOW) {
      frames.push([ball.x, ball.y]);
      break;
    }
    ball.vx = (ball.vx * slower) / speed;
    ball.vy = (ball.vy * slower) / speed;
    frames.push([ball.x, ball.y]);
  }
  return { frames, x: roundTo(ball.x, 3), y: roundTo(ball.y, 3), holed };
}

// The game. strokes counts every stroke so far by both players, which is also the number the next
// one is sent with. balls[p] is where player p's ball is on this hole and how many shots it's had,
// and cards[p] their score for each hole played.
const teeUp = (hole) => ({ x: HOLES[hole].tee.x, y: HOLES[hole].tee.y, shots: 0, holed: false });

export const newGolfGame = () => ({
  hole: 0,
  strokes: 0,
  balls: [teeUp(0), teeUp(0)],
  cards: [[], []],
});

const finished = (ball) => ball.holed || ball.shots >= MAX_STROKES;
export const holeScore = (ball) => (ball.holed ? ball.shots : GAVE_UP_SCORE);
export const total = (card) => card.reduce((sum, score) => sum + score, 0);
export const golfOver = (game) => game.hole >= HOLES.length;

// Whose stroke it is, or null once the round is over. The hole's opener takes turns with the
// other, and once one of them is done the other plays on alone. The opener swaps each hole and
// each rematch.
export function golfTurn(game, match) {
  if (golfOver(game)) return null;
  const opener = (game.hole + match) % 2;
  const [a, b] = [game.balls[opener], game.balls[1 - opener]];
  if (finished(a)) return 1 - opener;
  if (finished(b)) return opener;
  return a.shots <= b.shots ? opener : 1 - opener;
}

// The stroke just played by whoever's turn it was, ending at { x, y, holed }. Once both are done
// with a hole, its scores go on the cards and both tee up on the next.
export function applyStroke(game, match, { x, y, holed }) {
  const by = golfTurn(game, match);
  if (by === null) return game;
  const balls = game.balls.map((ball, p) =>
    p === by ? { x, y, shots: ball.shots + 1, holed: Boolean(holed) } : ball
  );
  const next = { ...game, strokes: game.strokes + 1, balls };
  if (!balls.every(finished)) return next;
  const cards = game.cards.map((card, p) => [...card, holeScore(balls[p])]);
  const hole = game.hole + 1;
  return {
    ...next,
    hole,
    cards,
    balls: hole < HOLES.length ? [teeUp(hole), teeUp(hole)] : balls,
  };
}

// Who has the lower total once all six are played: 0, 1, or "draw". null until then.
export function golfWinner(game) {
  if (!golfOver(game)) return null;
  const [a, b] = game.cards.map(total);
  if (a === b) return "draw";
  return a < b ? 0 : 1;
}

// What goes over the wire for one stroke
export const writeStroke = (strokes, velocity, end) => ({
  n: strokes,
  vx: velocity.vx,
  vy: velocity.vy,
  x: end.x,
  y: end.y,
  holed: end.holed ? 1 : 0,
});

// A stroke from the other player, or null if it isn't the next one or doesn't make sense
export function readStroke(data, game) {
  if (!data || data.n !== game.strokes || golfOver(game)) return null;
  const { vx, vy, x, y, holed } = data;
  if (!finiteIn(vx, MAX_SPEED + 1) || !finiteIn(vy, MAX_SPEED + 1)) return null;
  if (!finiteIn(x, 1000) || !finiteIn(y, 1000) || (holed !== 0 && holed !== 1)) return null;
  if (x < 0 || x > COURSE_WIDTH || y < 0 || y > COURSE_HEIGHT) return null;
  return { velocity: { vx, vy }, end: { x, y, holed: holed === 1 } };
}
