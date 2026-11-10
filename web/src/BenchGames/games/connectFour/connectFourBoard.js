// The board is seven columns of discs, each listed from the bottom up. A disc is 0 for the one who
// sent the invite and 1 for the one who took it.
export const COLUMNS = 7;
export const ROWS = 6;
const LINE = 4;

export const emptyBoard = () => Array.from({ length: COLUMNS }, () => []);

export const canDrop = (board, column) =>
  Number.isInteger(column) && column >= 0 && column < COLUMNS && board[column].length < ROWS;

export function drop(board, column, player) {
  if (!canDrop(board, column)) return null;
  return board.map((discs, i) => (i === column ? [...discs, player] : discs));
}

const at = (board, column, row) => board[column]?.[row];

// The four in a row, as [column, row] pairs, or null while nobody has one
export function findLine(board) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row < board[column].length; row += 1) {
      const player = at(board, column, row);
      for (const [dc, dr] of directions) {
        const cells = [[column, row]];
        while (cells.length < LINE) {
          const [c, r] = cells[cells.length - 1];
          if (at(board, c + dc, r + dr) !== player) break;
          cells.push([c + dc, r + dr]);
        }
        if (cells.length === LINE) return { player, cells };
      }
    }
  }
  return null;
}

export const isFull = (board) => board.every((discs) => discs.length === ROWS);

// Whose turn it is after this many moves. The first game is opened by whoever sent the invite,
// and each rematch swaps who goes first.
export const turnAfter = (moves, match) => (moves + match) % 2;
