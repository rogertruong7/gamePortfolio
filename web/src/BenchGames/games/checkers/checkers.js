// English draughts on an 8 by 8 board. Squares are numbered row by row from the top left as the
// one who sent the invite sees it, so square i is at column i % 8 and row Math.floor(i / 8). Only
// the dark squares, where the row and column add up to an odd number, are played on. Each holds
// null or a piece { player, king }, where player is 0 for the inviter, whose men start at the
// bottom and move up, and 1 for the other, whose men start at the top and move down.
export const SIZE = 8;
export const SQUARES = SIZE * SIZE;
// With no capture and no man moving for this many moves in a row (forty each), it's a draw, so
// two kings can't chase each other round for ever
export const QUIET_LIMIT = 80;

export const isDark = (square) => (Math.floor(square / SIZE) + (square % SIZE)) % 2 === 1;
const columnOf = (square) => square % SIZE;
const rowOf = (square) => Math.floor(square / SIZE);
const onBoard = (column, row) => column >= 0 && column < SIZE && row >= 0 && row < SIZE;

export function newBoard() {
  return Array.from({ length: SQUARES }, (_, square) => {
    if (!isDark(square)) return null;
    const row = rowOf(square);
    if (row <= 2) return { player: 1, king: false };
    if (row >= 5) return { player: 0, king: false };
    return null;
  });
}

// The first game is opened by whoever sent the invite, and each rematch swaps who goes first
export const newGame = (match = 0) => ({ board: newBoard(), moves: 0, quiet: 0, first: match % 2 });
export const turnOf = (game) => (game.moves + game.first) % 2;

// Men move towards the far side: up the board for the inviter, down for the other
const forward = (player) => (player === 0 ? -1 : 1);
export const crownRow = (player) => (player === 0 ? 0 : SIZE - 1);

const directionsFor = (piece) => {
  const rows = piece.king ? [-1, 1] : [forward(piece.player)];
  return rows.flatMap((dr) => [
    [-1, dr],
    [1, dr],
  ]);
};

// Every way the piece on from can keep jumping, given the squares it has already jumped (which
// still count as taken until the move is over, and can't be jumped twice). A man that reaches the
// far row is crowned and that ends its move, as the rules say.
function jumpsFrom(board, from, piece, at, taken) {
  const paths = [];
  for (const [dc, dr] of directionsFor(piece)) {
    const overColumn = columnOf(at) + dc;
    const overRow = rowOf(at) + dr;
    const landColumn = overColumn + dc;
    const landRow = overRow + dr;
    if (!onBoard(landColumn, landRow)) continue;
    const over = overRow * SIZE + overColumn;
    const land = landRow * SIZE + landColumn;
    const victim = board[over];
    if (!victim || victim.player === piece.player || taken.includes(over)) continue;
    // The square it set off from is empty now, so it may land back there
    if (board[land] && land !== from) continue;
    const nowTaken = [...taken, over];
    const crowned = !piece.king && landRow === crownRow(piece.player);
    const further = crowned ? [] : jumpsFrom(board, from, piece, land, nowTaken);
    if (further.length) {
      for (const rest of further) paths.push({ path: [land, ...rest.path], taken: rest.taken });
    } else {
      paths.push({ path: [land], taken: nowTaken });
    }
  }
  return paths;
}

// Every legal move for player, each { path, taken }: path is the square it starts on and each one
// it lands on in turn, and taken the squares of the pieces it jumps. When any capture is possible
// one has to be taken, and a capture keeps going for as long as it can.
export function legalMoves(board, player) {
  const captures = [];
  const steps = [];
  for (let from = 0; from < SQUARES; from += 1) {
    const piece = board[from];
    if (!piece || piece.player !== player) continue;
    for (const jump of jumpsFrom(board, from, piece, from, [])) {
      captures.push({ path: [from, ...jump.path], taken: jump.taken });
    }
    if (captures.length) continue;
    for (const [dc, dr] of directionsFor(piece)) {
      const column = columnOf(from) + dc;
      const row = rowOf(from) + dr;
      if (onBoard(column, row) && !board[row * SIZE + column]) {
        steps.push({ path: [from, row * SIZE + column], taken: [] });
      }
    }
  }
  return captures.length ? captures : steps;
}

const samePath = (a, b) => a.length === b.length && a.every((square, i) => square === b[i]);

// The legal move that follows exactly this path, or null
export function findMove(board, player, path) {
  if (!Array.isArray(path)) return null;
  return legalMoves(board, player).find((move) => samePath(move.path, path)) ?? null;
}

// The legal moves that start with these squares, for picking a capture one landing at a time
export const movesStartingWith = (board, player, start) =>
  legalMoves(board, player).filter((move) => start.every((square, i) => move.path[i] === square));

// Plays the move along path for whoever's turn it is, or returns null if it isn't legal
export function play(game, path) {
  const player = turnOf(game);
  if (result(game)) return null;
  const move = findMove(game.board, player, path);
  if (!move) return null;
  const board = [...game.board];
  const from = move.path[0];
  const to = move.path[move.path.length - 1];
  const piece = board[from];
  board[from] = null;
  for (const square of move.taken) board[square] = null;
  const crowned = !piece.king && rowOf(to) === crownRow(player);
  board[to] = { player, king: piece.king || crowned };
  const quiet = move.taken.length || !piece.king ? 0 : game.quiet + 1;
  return { ...game, board, moves: game.moves + 1, quiet };
}

// null while the game goes on. Otherwise { winner } (0 or 1), or { winner: null } for a draw. A
// player loses when it's their turn and they've no pieces left or nothing they can move.
export function result(game) {
  const player = turnOf(game);
  if (legalMoves(game.board, player).length === 0) return { winner: 1 - player };
  if (game.quiet >= QUIET_LIMIT) return { winner: null };
  return null;
}

export const piecesLeft = (board, player) =>
  board.filter((piece) => piece && piece.player === player).length;

// Each player sees their own men at the bottom, so the one who took the invite sees the board
// turned round. Turning it round twice gets back where it started.
export const viewSquare = (square, flipped) => (flipped ? SQUARES - 1 - square : square);

// Where the arrow keys take the focus, in the board as this player sees it. It stops at the edges.
export function stepFocus(index, key) {
  const column = index % SIZE;
  const row = Math.floor(index / SIZE);
  if (key === "ArrowLeft") return column > 0 ? index - 1 : index;
  if (key === "ArrowRight") return column < SIZE - 1 ? index + 1 : index;
  if (key === "ArrowUp") return row > 0 ? index - SIZE : index;
  if (key === "ArrowDown") return row < SIZE - 1 ? index + SIZE : index;
  return null;
}
