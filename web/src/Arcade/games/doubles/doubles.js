// The rules of Doubles: numbered tiles on a 4 by 4 grid all slide one way at a time, two the same
// that meet join into one worth both, and a new tile turns up after every move. Every function
// takes a game and gives back a new one.

export const SIZE = 4;
export const GOAL = 2048;
// One new tile in ten is a 4 instead of a 2
const FOUR_CHANCE = 0.1;
export const DIRECTIONS = ["up", "down", "left", "right"];

// tiles are { id, value, row, col }. merged says a tile just took another in, and fresh that it
// just turned up, for the screen to animate. gone are the tiles taken in by the last move, at the
// place they slid to, so they can be drawn sliding there before they vanish.
function emptyGame() {
  return { tiles: [], gone: [], nextId: 1, score: 0, moves: 0, won: false, over: false };
}

const at = (tiles) => {
  const grid = new Map();
  for (const tile of tiles) grid.set(tile.row * SIZE + tile.col, tile);
  return grid;
};

// A 2 (or now and then a 4) in a random empty square
function addTile(game, random) {
  const taken = at(game.tiles);
  const empty = [];
  for (let i = 0; i < SIZE * SIZE; i += 1) if (!taken.has(i)) empty.push(i);
  if (!empty.length) return game;
  const square = empty[Math.floor(random() * empty.length)];
  const tile = {
    id: game.nextId,
    value: random() < FOUR_CHANCE ? 4 : 2,
    row: Math.floor(square / SIZE),
    col: square % SIZE,
    fresh: true,
  };
  return { ...game, tiles: [...game.tiles, tile], nextId: game.nextId + 1 };
}

// random is a function giving numbers in [0, 1), like Math.random or shared/random.js
export function newGame(random) {
  return addTile(addTile(emptyGame(), random), random);
}

// The squares of each line in the order tiles slide through them, the far end first
function lines(direction) {
  const result = [];
  for (let a = 0; a < SIZE; a += 1) {
    const line = [];
    for (let b = 0; b < SIZE; b += 1) {
      if (direction === "left") line.push([a, b]);
      if (direction === "right") line.push([a, SIZE - 1 - b]);
      if (direction === "up") line.push([b, a]);
      if (direction === "down") line.push([SIZE - 1 - b, a]);
    }
    result.push(line);
  }
  return result;
}

// Every tile slides as far as it can. Each tile joins at most one other per move.
function slideTiles(tiles, direction) {
  const grid = at(tiles);
  const kept = [];
  const gone = [];
  let points = 0;
  for (const line of lines(direction)) {
    const inLine = line.map(([row, col]) => grid.get(row * SIZE + col)).filter(Boolean);
    let place = 0;
    let last = null;
    for (const tile of inLine) {
      if (last && !last.merged && last.value === tile.value) {
        last.value *= 2;
        last.merged = true;
        points += last.value;
        gone.push({ ...tile, row: last.row, col: last.col, merged: false, fresh: false });
        continue;
      }
      const [row, col] = line[place];
      place += 1;
      last = { ...tile, row, col, merged: false, fresh: false };
      kept.push(last);
    }
  }
  return { kept, gone, points };
}

export const tileAt = (game, row, col) =>
  game.tiles.find((tile) => tile.row === row && tile.col === col) ?? null;

export function canMove(game) {
  if (game.tiles.length < SIZE * SIZE) return true;
  const grid = at(game.tiles);
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = grid.get(row * SIZE + col).value;
      if (col + 1 < SIZE && grid.get(row * SIZE + col + 1).value === value) return true;
      if (row + 1 < SIZE && grid.get((row + 1) * SIZE + col).value === value) return true;
    }
  }
  return false;
}

// Slides everything one way. A move that changes nothing doesn't count and adds no tile.
export function slide(game, direction, random) {
  if (game.over || !DIRECTIONS.includes(direction)) return game;
  const { kept, gone, points } = slideTiles(game.tiles, direction);
  const changed =
    gone.length > 0 ||
    kept.some((tile) => {
      const before = game.tiles.find((old) => old.id === tile.id);
      return before.row !== tile.row || before.col !== tile.col;
    });
  if (!changed) return game;
  const next = addTile(
    { ...game, tiles: kept, gone, score: game.score + points, moves: game.moves + 1 },
    random
  );
  const won = game.won || kept.some((tile) => tile.value >= GOAL);
  return { ...next, won, over: !canMove(next) };
}

export const biggest = (game) => game.tiles.reduce((most, tile) => Math.max(most, tile.value), 0);
