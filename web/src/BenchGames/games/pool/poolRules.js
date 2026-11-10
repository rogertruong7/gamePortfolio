import {
  BALLS,
  FOOT_SPOT,
  HEAD_SPOT,
  HEAD_STRING,
  HEIGHT,
  OFF,
  RADIUS,
  WIDTH,
  isOff,
  rack,
} from "./poolPhysics.js";

// 8-ball. Players are 0 for the one who sent the invite and 1 for the one who took it. Both
// screens run every shot through applyShot with the same numbers, so they always agree on
// fouls, groups, whose turn it is and who won.

export const GROUPS = {
  solids: [1, 2, 3, 4, 5, 6, 7],
  stripes: [9, 10, 11, 12, 13, 14, 15],
};

export const groupOf = (id) =>
  id >= 1 && id <= 7 ? "solids" : id >= 9 && id <= 15 ? "stripes" : null;

// The first game is broken by whoever sent the invite, and each rematch swaps who breaks.
// inHand is where the white may be put before the next shot: "kitchen" (behind the head
// string, for the break), "table" (anywhere, after a foul) or null.
export const newGame = (match) => ({
  pos: rack(),
  sunk: [],
  turn: match % 2,
  solids: null,
  inHand: "kitchen",
  shots: 0,
  winner: null,
  last: null,
});

export const playerGroup = (game, player) =>
  game.solids === null ? null : game.solids === player ? "solids" : "stripes";

export const ballsLeft = (game, group) =>
  GROUPS[group].filter((id) => !game.sunk.includes(id)).length;

// A ball fits at x, y if it's on the cloth and clear of every ball still on the table (other
// than skip, the one being moved)
export function fits(pos, x, y, skip = -1) {
  if (!(x >= RADIUS && x <= WIDTH - RADIUS && y >= RADIUS && y <= HEIGHT - RADIUS)) return false;
  for (let i = 0; i < BALLS; i += 1) {
    if (i === skip || isOff(pos[i * 2])) continue;
    if ((pos[i * 2] - x) ** 2 + (pos[i * 2 + 1] - y) ** 2 < 4 * RADIUS * RADIUS) return false;
  }
  return true;
}

export const canPlaceCue = (game, x, y) =>
  Boolean(game.inHand) &&
  fits(game.pos, x, y, 0) &&
  (game.inHand !== "kitchen" || x <= HEAD_STRING);

// The nearest free place to a spot, looking along the table first, then a row up or down at a
// time. Always the same answer for the same table, so both screens put a ball back in the same
// place.
function freeSpot(pos, spot, skip) {
  for (let row = 0; row <= HEIGHT / RADIUS; row += 1) {
    const dy = Math.ceil(row / 2) * RADIUS * (row % 2 ? -1 : 1);
    for (let col = 0; col <= (WIDTH * 4) / RADIUS; col += 1) {
      const dx = Math.ceil(col / 2) * (RADIUS / 2) * (col % 2 ? 1 : -1);
      if (fits(pos, spot.x + dx, spot.y + dy, skip)) return { x: spot.x + dx, y: spot.y + dy };
    }
  }
  return { x: spot.x, y: spot.y };
}

const isId = (id) => Number.isInteger(id) && id >= 0 && id < BALLS;
const isAngle = (n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 100;
const onCloth = (n, max) => typeof n === "number" && n >= -RADIUS * 4 && n <= max + RADIUS * 4;

// What a shot sends: its number, how it was struck and from where, and where everything ended
// up, so the other screen can replay it and then use exactly the same result
export function shotData(game, cue, angle, power, result) {
  return {
    shot: game.shots,
    angle,
    power,
    cx: cue.x,
    cy: cue.y,
    pos: result.pos,
    sunk: [...result.sunk],
    first: result.first,
  };
}

// Checks a shot's data against the game it's meant for. Null for a stale or repeated shot
// number or anything malformed.
export function readShot(data, game) {
  if (!data || game.winner !== null || data.shot !== game.shots) return null;
  const { angle, power, cx, cy, pos, sunk, first } = data;
  if (!isAngle(angle) || typeof power !== "number" || !(power >= 0 && power <= 1)) return null;
  if (!onCloth(cx, WIDTH) || !onCloth(cy, HEIGHT)) return null;
  if (!Array.isArray(pos) || pos.length !== BALLS * 2) return null;
  for (let i = 0; i < BALLS; i += 1) {
    const x = pos[i * 2];
    const y = pos[i * 2 + 1];
    const off = x === OFF && y === OFF;
    if (!off && !(onCloth(x, WIDTH) && onCloth(y, HEIGHT))) return null;
  }
  if (!Array.isArray(sunk) || !sunk.every(isId) || new Set(sunk).size !== sunk.length) return null;
  if (sunk.some((id) => game.sunk.includes(id))) return null;
  if (!(first === -1 || (isId(first) && first !== 0))) return null;
  return { angle, power, cue: { x: cx, y: cy }, pos: [...pos], sunk: [...sunk], first };
}

// The table to shoot from: the last one, with the white wherever it was put for ball in hand
export function startPos(game, cue) {
  const pos = [...game.pos];
  if (game.inHand) {
    pos[0] = cue.x;
    pos[1] = cue.y;
  }
  return pos;
}

// What a shot means. foul is "scratch" (the white went down), "miss" (it hit nothing) or
// "wrong" (it hit something other than one of the shooter's balls first).
export function applyShot(game, shot) {
  const shooter = game.turn;
  const other = 1 - shooter;
  const breaking = game.shots === 0;
  const potted = shot.sunk.filter((id) => id !== 0 && id !== 8);
  const whiteIn = shot.sunk.includes(0);
  const blackIn = shot.sunk.includes(8);
  const mine = playerGroup(game, shooter);
  // Only once every one of their balls is down may they go for the black
  const cleared = mine !== null && GROUPS[mine].every((id) => game.sunk.includes(id));

  let foul = null;
  if (shot.first < 0) foul = "miss";
  else if (!breaking) {
    // On an open table anything but the black will do
    let legal = shot.first !== 8;
    if (cleared) legal = shot.first === 8;
    else if (mine) legal = groupOf(shot.first) === mine;
    if (!legal) foul = "wrong";
  }
  if (whiteIn) foul = "scratch";

  const pos = [...shot.pos];
  const sunk = [...game.sunk, ...potted];
  let winner = null;
  let respotted = false;
  if (blackIn && breaking) {
    // The black down on the break comes back to the foot spot rather than ending the game
    pos[16] = OFF;
    pos[17] = OFF;
    const spot = freeSpot(pos, FOOT_SPOT, 8);
    pos[16] = spot.x;
    pos[17] = spot.y;
    respotted = true;
  } else if (blackIn) {
    sunk.push(8);
    winner = cleared && !foul ? shooter : other;
  }
  for (const id of sunk) {
    pos[id * 2] = OFF;
    pos[id * 2 + 1] = OFF;
  }
  if (whiteIn) {
    pos[0] = OFF;
    pos[1] = OFF;
    const spot = freeSpot(pos, HEAD_SPOT, 0);
    pos[0] = spot.x;
    pos[1] = spot.y;
  }

  // The table stays open after the break. After that, the first ball potted in a clean shot
  // picks the shooter's group.
  let solids = game.solids;
  if (solids === null && !breaking && !foul && potted.length) {
    solids = groupOf(potted[0]) === "solids" ? shooter : other;
  }
  const group = solids === null ? null : solids === shooter ? "solids" : "stripes";
  const scored =
    (group === null ? potted.length > 0 : potted.some((id) => groupOf(id) === group)) ||
    respotted;
  const keepsGoing = !foul && scored;

  return {
    pos,
    sunk: sunk.sort((a, b) => a - b),
    turn: keepsGoing ? shooter : other,
    solids,
    inHand: foul ? "table" : null,
    shots: game.shots + 1,
    winner,
    last: {
      shooter,
      foul,
      potted: shot.sunk.filter((id) => id !== 0),
      assigned: solids !== game.solids,
      respotted,
    },
  };
}
