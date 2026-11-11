// The rules of Block Drop, a falling-block puzzle: pieces of four squares fall into a well ten
// wide and twenty deep, and a row that fills up clears. Every function takes a game and gives back
// a new one, so the screen only has to keep the latest and draw it.

export const WIDTH = 10;
export const HEIGHT = 20;
export const PIECES = ["I", "O", "T", "S", "Z", "J", "L"];
// How many pieces coming up the screen shows
export const SHOWN_NEXT = 3;
// A piece resting on something locks after this long, unless it's moved or turned
export const LOCK_MS = 500;
// Moving or turning a resting piece starts its lock again, but only this many times
const LOCK_RESETS = 15;
// A soft drop falls a row this often at most
const SOFT_DROP_MS = 40;
export const LINES_PER_LEVEL = 10;
const LINE_POINTS = [0, 100, 300, 500, 800];

// Each piece's squares in a box size across, before turning
const SHAPES = {
  I: {
    size: 4,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    size: 2,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  T: {
    size: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    size: 3,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    size: 3,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    size: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    size: 3,
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};

// Where a turn that's blocked tries next: a step either way, then up, then two steps either way
const KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [-2, 0],
  [2, 0],
];

// The squares of a piece turned rot quarter turns clockwise, inside its box
export function cellsOf(type, rot) {
  const { size, cells } = SHAPES[type];
  const turns = ((rot % 4) + 4) % 4;
  return cells.map(([x, y]) => {
    let cx = x;
    let cy = y;
    for (let i = 0; i < turns; i += 1) [cx, cy] = [size - 1 - cy, cx];
    return [cx, cy];
  });
}

// Its squares on the board. Rows above the top (y < 0) are allowed while it comes in.
export const squaresOf = (piece) =>
  cellsOf(piece.type, piece.rot).map(([x, y]) => [piece.x + x, piece.y + y]);

export function fits(board, piece) {
  return squaresOf(piece).every(
    ([x, y]) => x >= 0 && x < WIDTH && y < HEIGHT && (y < 0 || !board[y * WIDTH + x])
  );
}

// Each run of seven has every piece once, in a shuffled order, so none goes missing for long
function shuffledBag(random) {
  const bag = [...PIECES];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function topUp(queue, random) {
  let next = queue;
  while (next.length < SHOWN_NEXT + 1) next = [...next, ...shuffledBag(random)];
  return next;
}

// A new piece at the top, in the middle
export function spawn(type) {
  const { size } = SHAPES[type];
  return { type, rot: 0, x: Math.floor((WIDTH - size) / 2), y: type === "I" ? -1 : 0 };
}

export const levelOf = (lines) => 1 + Math.floor(lines / LINES_PER_LEVEL);

// How long a piece takes to fall one row, getting quicker each level
export const fallMs = (level) => Math.max(50, Math.round(800 * 0.82 ** (level - 1)));

// random is a function giving numbers in [0, 1), like Math.random or shared/random.js
export function newGame(random) {
  const queue = topUp([], random);
  return bringIn(
    {
      board: new Array(WIDTH * HEIGHT).fill(null),
      piece: null,
      queue,
      hold: null,
      canHold: true,
      score: 0,
      lines: 0,
      level: 1,
      fall: 0,
      lockMs: 0,
      lockResets: 0,
      over: false,
      cleared: [],
    },
    random
  );
}

// The next piece in the queue comes in. It's over if there's no room for it.
function bringIn(game, random, type = null) {
  let queue = game.queue;
  let next = type;
  if (!next) {
    [next, ...queue] = queue;
    queue = topUp(queue, random);
  }
  const piece = spawn(next);
  return {
    ...game,
    piece,
    queue,
    fall: 0,
    lockMs: 0,
    lockResets: 0,
    over: !fits(game.board, piece),
  };
}

const grounded = (game) => !fits(game.board, { ...game.piece, y: game.piece.y + 1 });

// Where the piece would land, for the outline under it
export function landing(game) {
  let piece = game.piece;
  while (fits(game.board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };
  return piece;
}

// Puts the piece into the board, clears any full rows and brings in the next piece
function lock(game, random) {
  const board = game.board.slice();
  let above = false;
  for (const [x, y] of squaresOf(game.piece)) {
    if (y < 0) above = true;
    else board[y * WIDTH + x] = game.piece.type;
  }
  // Locking with a square still above the top is the end
  if (above) return { ...game, board, over: true };

  const cleared = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    let full = true;
    for (let x = 0; x < WIDTH && full; x += 1) full = board[y * WIDTH + x] !== null;
    if (full) cleared.push(y);
  }
  let settled = board;
  if (cleared.length) {
    const kept = [];
    for (let y = 0; y < HEIGHT; y += 1) {
      if (!cleared.includes(y)) kept.push(board.slice(y * WIDTH, (y + 1) * WIDTH));
    }
    const empty = new Array(cleared.length * WIDTH).fill(null);
    settled = [...empty, ...kept.flat()];
  }
  const lines = game.lines + cleared.length;
  const score = game.score + LINE_POINTS[cleared.length] * game.level;
  return bringIn(
    { ...game, board: settled, lines, level: levelOf(lines), score, canHold: true, cleared },
    random
  );
}

// A move or turn that worked. If the piece is resting, the lock starts again (a few times).
function moved(game, piece) {
  const next = { ...game, piece };
  if (grounded(next) && game.lockResets < LOCK_RESETS) {
    return { ...next, lockMs: 0, lockResets: game.lockResets + 1 };
  }
  return next;
}

export function shift(game, dx) {
  if (game.over) return game;
  const piece = { ...game.piece, x: game.piece.x + dx };
  return fits(game.board, piece) ? moved(game, piece) : game;
}

// dir is 1 for clockwise and -1 for the other way
export function rotate(game, dir) {
  if (game.over || game.piece.type === "O") return game;
  const turned = { ...game.piece, rot: (game.piece.rot + dir + 4) % 4 };
  for (const [dx, dy] of KICKS) {
    const piece = { ...turned, x: turned.x + dx, y: turned.y + dy };
    if (fits(game.board, piece)) return moved(game, piece);
  }
  return game;
}

// Straight down and locked there, for two points a row
export function hardDrop(game, random) {
  if (game.over) return game;
  const piece = landing(game);
  const rows = piece.y - game.piece.y;
  return lock({ ...game, piece, score: game.score + rows * 2 }, random);
}

// Puts the piece aside and takes the one put aside before, once per piece
export function hold(game, random) {
  if (game.over || !game.canHold) return game;
  const held = game.piece.type;
  const next = bringIn({ ...game, hold: held }, random, game.hold);
  return { ...next, canHold: false };
}

// Time passing: the piece falls, and locks once it's been resting long enough. soft says the
// player is holding it down, which is quicker and a point a row.
export function tick(game, ms, soft, random) {
  if (game.over) return game;
  let next = { ...game, cleared: [] };
  const step = soft ? Math.min(SOFT_DROP_MS, fallMs(game.level)) : fallMs(game.level);
  if (!grounded(next)) {
    let fall = next.fall + ms;
    let { piece, score } = next;
    while (fall >= step && fits(next.board, { ...piece, y: piece.y + 1 })) {
      piece = { ...piece, y: piece.y + 1 };
      fall -= step;
      if (soft) score += 1;
    }
    next = { ...next, piece, score, fall };
    if (!grounded(next)) return next;
    // It's just landed, and the time left over counts towards the lock
    return { ...next, fall: 0, lockMs: Math.min(fall, LOCK_MS - 1) };
  }
  const lockMs = next.lockMs + ms;
  return lockMs >= LOCK_MS ? lock(next, random) : { ...next, fall: 0, lockMs };
}
