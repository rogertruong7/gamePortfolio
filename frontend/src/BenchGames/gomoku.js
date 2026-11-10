// The board is SIZE by SIZE points, listed row by row from the top left, so point i is at column
// i % SIZE and row Math.floor(i / SIZE). Each is null while empty, 0 for a stone from the one who
// sent the invite and 1 for one from the one who took it. 15 by 15 is the usual size, but 13 by 13
// keeps the points big enough to tap on a phone.
export const SIZE = 13;
export const POINTS = SIZE * SIZE;
const ROW = 5;

export const emptyBoard = () => Array(POINTS).fill(null);

export const canPlace = (board, point) =>
  Number.isInteger(point) && point >= 0 && point < POINTS && board[point] === null;

export function place(board, point, player) {
  if (!canPlace(board, point)) return null;
  const next = [...board];
  next[point] = player;
  return next;
}

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

// The row of five or more through point, as a list of points, or null if it doesn't make one.
// Six or more in a row counts too.
export function rowThrough(board, point) {
  const player = board[point];
  if (player === null || player === undefined) return null;
  const column = point % SIZE;
  const row = Math.floor(point / SIZE);
  const stoneAt = (c, r) =>
    c >= 0 && c < SIZE && r >= 0 && r < SIZE && board[r * SIZE + c] === player;
  for (const [dc, dr] of DIRECTIONS) {
    const points = [point];
    for (const sign of [1, -1]) {
      let c = column + dc * sign;
      let r = row + dr * sign;
      while (stoneAt(c, r)) {
        points.push(r * SIZE + c);
        c += dc * sign;
        r += dr * sign;
      }
    }
    if (points.length >= ROW) return points.sort((a, b) => a - b);
  }
  return null;
}

// Any winning row on the board, with whose it is, or null
export function findRow(board) {
  for (let point = 0; point < POINTS; point += 1) {
    const points = rowThrough(board, point);
    if (points) return { player: board[point], points };
  }
  return null;
}

export const isFull = (board) => board.every((stone) => stone !== null);

// Whose turn it is after this many stones. The first game is opened by whoever sent the invite,
// and each rematch swaps who goes first.
export const turnAfter = (moves, match) => (moves + match) % 2;

// Where the arrow keys take the focus on a size by size grid. It stops at the edges rather than
// wrapping, so holding a key down doesn't fling it to the far side.
export function stepFocus(index, key, size = SIZE) {
  const column = index % size;
  const row = Math.floor(index / size);
  if (key === "ArrowLeft") return column > 0 ? index - 1 : index;
  if (key === "ArrowRight") return column < size - 1 ? index + 1 : index;
  if (key === "ArrowUp") return row > 0 ? index - size : index;
  if (key === "ArrowDown") return row < size - 1 ? index + size : index;
  if (key === "Home") return row * size;
  if (key === "End") return row * size + size - 1;
  return null;
}
