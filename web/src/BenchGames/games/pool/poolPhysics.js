// A top-down pool table. Units are table units: the cloth is 200 by 100, with y pointing down
// as on the canvas. Ball 0 is the white, 1 to 7 are solids, 8 is the black and 9 to 15 are
// stripes. Positions travel as one flat list, x then y for each ball in id order, and a ball
// that's gone down a pocket sits at OFF.
export const WIDTH = 200;
export const HEIGHT = 100;
export const RADIUS = 3;
export const BALLS = 16;
export const OFF = -10;
export const HEAD_STRING = WIDTH / 4;
export const HEAD_SPOT = { x: WIDTH / 4, y: HEIGHT / 2 };
export const FOOT_SPOT = { x: (WIDTH * 3) / 4, y: HEIGHT / 2 };

// Fast enough to cross the table in under half a second. At this speed and step a ball moves a
// quarter of its radius per step, so it can't pass through another ball or a cushion.
export const MAX_SPEED = 450;
const STEP = 1 / 600;
export const FRAME_RATE = 60;
const STEPS_PER_FRAME = 600 / FRAME_RATE;
// Nothing on a real table rolls for a minute, but a bug shouldn't spin forever
const MAX_STEPS = 60 * 600;

// The cloth slows a ball by a steady amount plus a little more when it's quick, and anything
// slower than STOP has stopped
const ROLL_DECEL = 22;
const DRAG = 0.12;
const STOP = 1.5;
const BALL_BOUNCE = 0.96;
const CUSHION_BOUNCE = 0.78;
const CUSHION_GRIP = 0.96;

// Where the cushions stop short of each pocket, and how far the jaws reach back into it
const CORNER_MOUTH = 7.5;
const SIDE_MOUTH = 5.5;
const JAW = 4;

// A ball whose centre comes within r of a pocket's point drops in
export const POCKETS = [
  { x: -1, y: -1, r: 5.5 },
  { x: WIDTH / 2, y: -2.5, r: 4.5 },
  { x: WIDTH + 1, y: -1, r: 5.5 },
  { x: -1, y: HEIGHT + 1, r: 5.5 },
  { x: WIDTH / 2, y: HEIGHT + 2.5, r: 4.5 },
  { x: WIDTH + 1, y: HEIGHT + 1, r: 5.5 },
];

// The cushions as straight segments. The short angled ones are the jaws either side of each
// pocket, and a segment's ends count too, so the jaw tips round off like the real thing.
const W = WIDTH;
const H = HEIGHT;
const C = CORNER_MOUTH;
const S = SIDE_MOUTH;
export const CUSHIONS = [
  [C, 0, W / 2 - S, 0],
  [W / 2 + S, 0, W - C, 0],
  [C, H, W / 2 - S, H],
  [W / 2 + S, H, W - C, H],
  [0, C, 0, H - C],
  [W, C, W, H - C],
  [C, 0, C - JAW, -JAW],
  [0, C, -JAW, C - JAW],
  [W - C, 0, W - C + JAW, -JAW],
  [W, C, W + JAW, C - JAW],
  [C, H, C - JAW, H + JAW],
  [0, H - C, -JAW, H - C + JAW],
  [W - C, H, W - C + JAW, H + JAW],
  [W, H - C, W + JAW, H - C + JAW],
  [W / 2 - S, 0, W / 2 - S + 1, -3.5],
  [W / 2 + S, 0, W / 2 + S - 1, -3.5],
  [W / 2 - S, H, W / 2 - S + 1, H + 3.5],
  [W / 2 + S, H, W / 2 + S - 1, H + 3.5],
];

export const isOff = (x) => x <= OFF + 1;

// The fifteen in a triangle with the point on the foot spot, the black in the middle of the
// third row and a solid and a stripe in the back corners. The little gap keeps them from
// starting out overlapping.
const RACK_ORDER = [[1], [9, 2], [10, 8, 3], [11, 7, 14, 4], [5, 13, 15, 6, 12]];
export function rack() {
  const pos = new Array(BALLS * 2).fill(0);
  pos[0] = HEAD_SPOT.x;
  pos[1] = HEAD_SPOT.y;
  const gap = 0.02;
  const across = 2 * RADIUS + gap;
  const along = across * (Math.sqrt(3) / 2);
  RACK_ORDER.forEach((row, r) => {
    row.forEach((id, i) => {
      pos[id * 2] = FOOT_SPOT.x + r * along;
      pos[id * 2 + 1] = FOOT_SPOT.y + (i - r / 2) * across;
    });
  });
  return pos;
}

export function createWorld(pos) {
  const world = {
    x: new Float64Array(BALLS),
    y: new Float64Array(BALLS),
    vx: new Float64Array(BALLS),
    vy: new Float64Array(BALLS),
    on: new Uint8Array(BALLS),
    sunk: [],
    // The first ball the white touched, or -1 while it hasn't touched one
    first: -1,
  };
  for (let i = 0; i < BALLS; i += 1) {
    world.on[i] = isOff(pos[i * 2]) ? 0 : 1;
    world.x[i] = pos[i * 2];
    world.y[i] = pos[i * 2 + 1];
  }
  return world;
}

export const positions = (world) => {
  const pos = new Array(BALLS * 2);
  for (let i = 0; i < BALLS; i += 1) {
    pos[i * 2] = world.on[i] ? world.x[i] : OFF;
    pos[i * 2 + 1] = world.on[i] ? world.y[i] : OFF;
  }
  return pos;
};

export const moving = (world) => {
  for (let i = 0; i < BALLS; i += 1) {
    if (world.on[i] && (world.vx[i] !== 0 || world.vy[i] !== 0)) return true;
  }
  return false;
};

function hitCushions(world, i) {
  for (const [ax, ay, bx, by] of CUSHIONS) {
    const sx = bx - ax;
    const sy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, ((world.x[i] - ax) * sx + (world.y[i] - ay) * sy) / (sx * sx + sy * sy))
    );
    const dx = world.x[i] - (ax + sx * t);
    const dy = world.y[i] - (ay + sy * t);
    const d2 = dx * dx + dy * dy;
    if (d2 >= RADIUS * RADIUS || d2 === 0) continue;
    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    world.x[i] += nx * (RADIUS - d);
    world.y[i] += ny * (RADIUS - d);
    const vn = world.vx[i] * nx + world.vy[i] * ny;
    if (vn >= 0) continue;
    // Bounce the part going into the cushion back out, softer, and rub a bit off the rest
    const tx = world.vx[i] - vn * nx;
    const ty = world.vy[i] - vn * ny;
    world.vx[i] = tx * CUSHION_GRIP - vn * CUSHION_BOUNCE * nx;
    world.vy[i] = ty * CUSHION_GRIP - vn * CUSHION_BOUNCE * ny;
  }
}

// Equal balls, so a head-on hit hands the speed along the line between their centres across
// and leaves the rest. Overlaps (from a fast step, or positions rounded for sending) are pushed
// apart half each way.
function hitBalls(world, i, j) {
  const dx = world.x[j] - world.x[i];
  const dy = world.y[j] - world.y[i];
  const d2 = dx * dx + dy * dy;
  const reach = 2 * RADIUS;
  if (d2 >= reach * reach) return;
  const d = Math.sqrt(d2);
  const nx = d > 0 ? dx / d : 1;
  const ny = d > 0 ? dy / d : 0;
  const push = (reach - d) / 2;
  world.x[i] -= nx * push;
  world.y[i] -= ny * push;
  world.x[j] += nx * push;
  world.y[j] += ny * push;
  const closing = (world.vx[i] - world.vx[j]) * nx + (world.vy[i] - world.vy[j]) * ny;
  if (closing <= 0) return;
  const impulse = ((1 + BALL_BOUNCE) / 2) * closing;
  world.vx[i] -= impulse * nx;
  world.vy[i] -= impulse * ny;
  world.vx[j] += impulse * nx;
  world.vy[j] += impulse * ny;
  if (world.first < 0 && (i === 0 || j === 0)) world.first = i === 0 ? j : i;
}

export const collideBalls = hitBalls;

function dropInPockets(world, i) {
  const x = world.x[i];
  const y = world.y[i];
  // Past the cushion line can only be through a mouth, so anything that far out is down
  const outside = x < -RADIUS || x > WIDTH + RADIUS || y < -RADIUS || y > HEIGHT + RADIUS;
  const inPocket = POCKETS.some((p) => (x - p.x) ** 2 + (y - p.y) ** 2 < p.r * p.r);
  if (!outside && !inPocket) return;
  world.on[i] = 0;
  world.vx[i] = 0;
  world.vy[i] = 0;
  world.sunk.push(i);
}

function slow(world, i) {
  const speed = Math.hypot(world.vx[i], world.vy[i]);
  if (speed === 0) return;
  const next = speed - (ROLL_DECEL + DRAG * speed) * STEP;
  const scale = next < STOP ? 0 : next / speed;
  world.vx[i] *= scale;
  world.vy[i] *= scale;
}

// Near enough to a cushion to be worth checking it
const nearEdge = (x, y) =>
  x < RADIUS * 2 || x > WIDTH - RADIUS * 2 || y < RADIUS * 2 || y > HEIGHT - RADIUS * 2;

export function stepWorld(world) {
  const { on } = world;
  for (let i = 0; i < BALLS; i += 1) {
    if (!on[i]) continue;
    world.x[i] += world.vx[i] * STEP;
    world.y[i] += world.vy[i] * STEP;
  }
  for (let i = 0; i < BALLS; i += 1) {
    if (on[i] && nearEdge(world.x[i], world.y[i])) hitCushions(world, i);
  }
  for (let i = 0; i < BALLS; i += 1) {
    if (!on[i]) continue;
    for (let j = i + 1; j < BALLS; j += 1) if (on[j]) hitBalls(world, i, j);
  }
  for (let i = 0; i < BALLS; i += 1) {
    if (on[i]) dropInPockets(world, i);
  }
  for (let i = 0; i < BALLS; i += 1) if (on[i]) slow(world, i);
}

// Plays one shot from pos: the white is struck at angle (radians, 0 is towards the foot of the
// table) with power from 0 to 1. Gives where everything ends up, what went down in what order,
// the first ball the white touched, and with frames, the positions FRAME_RATE times a second to
// animate it.
export function simulate(pos, angle, power, { frames: record = false } = {}) {
  const world = createWorld(pos);
  const speed = Math.max(0, Math.min(1, power)) * MAX_SPEED;
  world.vx[0] = Math.cos(angle) * speed;
  world.vy[0] = Math.sin(angle) * speed;
  const frames = [];
  for (let step = 1; step <= MAX_STEPS; step += 1) {
    stepWorld(world);
    if (record && step % STEPS_PER_FRAME === 0) frames.push(positions(world));
    if (!moving(world)) break;
  }
  return { pos: positions(world), sunk: world.sunk, first: world.first, frames };
}

// To a tenth of a unit, as positions are sent
export const roundPos = (pos) => pos.map((v) => Math.round(v * 10) / 10);

// Where the white would first touch something going straight along angle: a ball (hit gives its
// id) or a cushion (hit is -1). For the aim line and its ghost ball.
export function aimAt(pos, angle) {
  const cx = pos[0];
  const cy = pos[1];
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let best = Infinity;
  let hit = -1;
  for (let i = 1; i < BALLS; i += 1) {
    if (isOff(pos[i * 2])) continue;
    const ox = pos[i * 2] - cx;
    const oy = pos[i * 2 + 1] - cy;
    const along = ox * ux + oy * uy;
    if (along <= 0) continue;
    const across2 = ox * ox + oy * oy - along * along;
    const reach2 = 4 * RADIUS * RADIUS;
    if (across2 > reach2) continue;
    const t = along - Math.sqrt(reach2 - across2);
    if (t < best) {
      best = Math.max(0, t);
      hit = i;
    }
  }
  const walls = [
    ux > 0 ? (WIDTH - RADIUS - cx) / ux : ux < 0 ? (RADIUS - cx) / ux : Infinity,
    uy > 0 ? (HEIGHT - RADIUS - cy) / uy : uy < 0 ? (RADIUS - cy) / uy : Infinity,
  ];
  const wall = Math.max(0, Math.min(...walls));
  if (wall < best) {
    best = wall;
    hit = -1;
  }
  return { x: cx + ux * best, y: cy + uy * best, hit };
}
