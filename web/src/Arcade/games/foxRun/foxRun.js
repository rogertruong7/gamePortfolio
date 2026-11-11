// The rules of Fox Run: a fox runs along a path through the town, ever faster, jumping rocks and
// stone lanterns and ducking under crows. Heights are measured up from the ground, and the world
// scrolls to the left past the fox, which stays put. step works out a slice of time and gives
// back a new game, so the screen can run it in fixed steps and get the same run every time.

export const WORLD = { width: 600, height: 200 };
export const GROUND = 168;
export const FOX_X = 56;
export const STEP_SECONDS = 1 / 120;

const GRAVITY = 2600;
const JUMP_SPEED = 820;
// Letting go of jump early cuts the climb short, for a little hop
const HOP_SPEED = 360;
// Ducking in the air pulls the fox down this much harder
const DIVE_GRAVITY = 3;
const START_SPEED = 320;
const TOP_SPEED = 820;
// How much quicker it gets each second
const SPEED_UP = 7;
// Points for each unit run
const POINTS_PER_UNIT = 1 / 32;
// Crows only show up once it's going a while
const CROWS_FROM = 450;

export const FOX = {
  run: { width: 36, height: 34 },
  duck: { width: 46, height: 20 },
};

// The bottom of a crow at each height: low ones have to be jumped, middle ones ducked under (or
// jumped well), and high ones are only trouble for a fox that jumps into them
export const CROW_HEIGHTS = [10, 28, 52];

export function newGame(random) {
  return {
    time: 0,
    speed: START_SPEED,
    distance: 0,
    y: 0,
    vy: 0,
    ducking: false,
    // A jump is only taken on the press, not by holding it down
    jumpWasHeld: false,
    obstacles: [],
    nextId: 1,
    // How far until the next obstacle turns up at the right
    gap: 260 + random() * 200,
    over: false,
  };
}

export const scoreOf = (game) => Math.floor(game.distance * POINTS_PER_UNIT);
export const onGround = (game) => game.y <= 0;

// The fox's box in the world: left, right, bottom and top, with heights up from the ground
export function foxBox(game) {
  const size = game.ducking && onGround(game) ? FOX.duck : FOX.run;
  return { left: FOX_X, right: FOX_X + size.width, bottom: game.y, top: game.y + size.height };
}

function makeObstacle(game, random) {
  const roll = random();
  const x = WORLD.width + 20;
  const id = game.nextId;
  if (game.distance > CROWS_FROM && roll < 0.22) {
    const level = Math.floor(random() * CROW_HEIGHTS.length);
    return { id, kind: "crow", x, width: 38, height: 22, bottom: CROW_HEIGHTS[level] };
  }
  if (roll < 0.5) {
    return { id, kind: "lantern", x, width: 22, height: 46 + Math.floor(random() * 8), bottom: 0 };
  }
  // One to three rocks side by side, more of them as it gets quicker
  const most = game.speed > 520 ? 3 : 2;
  const count = 1 + Math.floor(random() * most);
  return {
    id,
    kind: "rocks",
    count,
    x,
    width: count * 20 + 4,
    height: 22 + Math.floor(random() * 8),
    bottom: 0,
  };
}

// Room enough to land and jump again, more of it when it's quicker
function nextGap(game, obstacle, random) {
  const seconds = 0.85 + random() * 0.9;
  return obstacle.width + game.speed * seconds;
}

// A little smaller than they look, so a near miss is a miss
const FORGIVE = 4;

export function hits(fox, obstacle) {
  return (
    fox.right - FORGIVE > obstacle.x + FORGIVE &&
    fox.left + FORGIVE < obstacle.x + obstacle.width - FORGIVE &&
    fox.top - FORGIVE > obstacle.bottom &&
    fox.bottom + FORGIVE < obstacle.bottom + obstacle.height - FORGIVE / 2
  );
}

// input is { jump, duck }, whether each is held right now
export function step(game, input, random, seconds = STEP_SECONDS) {
  if (game.over) return game;
  const next = { ...game };
  const pressed = input.jump && !game.jumpWasHeld;
  next.jumpWasHeld = input.jump;
  next.ducking = input.duck;

  if (onGround(game) && pressed && !input.duck) next.vy = JUMP_SPEED;
  if (!input.jump && next.vy > HOP_SPEED) next.vy = HOP_SPEED;
  const pull = GRAVITY * (input.duck && !onGround(game) ? DIVE_GRAVITY : 1);
  next.vy -= pull * seconds;
  next.y = Math.max(0, game.y + next.vy * seconds);
  if (next.y === 0 && next.vy < 0) next.vy = 0;

  next.time = game.time + seconds;
  next.speed = Math.min(TOP_SPEED, game.speed + SPEED_UP * seconds);
  const moved = next.speed * seconds;
  next.distance = game.distance + moved;

  // Crows fly into the wind a little, so they come on a touch quicker than the ground
  let obstacles = game.obstacles
    .map((o) => ({ ...o, x: o.x - moved - (o.kind === "crow" ? 40 * seconds : 0) }))
    .filter((o) => o.x + o.width > -20);
  next.gap = game.gap - moved;
  if (next.gap <= 0) {
    const obstacle = makeObstacle(next, random);
    obstacles = [...obstacles, obstacle];
    next.nextId = game.nextId + 1;
    next.gap = nextGap(next, obstacle, random);
  }
  next.obstacles = obstacles;

  const fox = foxBox(next);
  if (obstacles.some((o) => hits(fox, o))) next.over = true;
  return next;
}
