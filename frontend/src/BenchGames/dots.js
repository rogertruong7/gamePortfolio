// A grid of BOXES by BOXES boxes, so one more dot than that each way. The lines between the dots
// are numbered with the across ones first, row by row from the top (BOXES in each of BOXES + 1
// rows), then the up and down ones, row by row (BOXES + 1 in each of BOXES rows). A player is 0 for
// the one who sent the invite and 1 for the one who took it.
export const BOXES = 5;
export const ACROSS = BOXES * (BOXES + 1);
export const LINES = ACROSS * 2;

export const acrossLine = (row, column) => row * BOXES + column;
export const downLine = (row, column) => ACROSS + row * (BOXES + 1) + column;
export const isAcross = (line) => line < ACROSS;

// The first game is opened by whoever sent the invite, and each rematch swaps who goes first
export const newGame = (match = 0) => ({
  lines: Array(LINES).fill(null),
  boxes: Array(BOXES * BOXES).fill(null),
  moves: 0,
  turn: match % 2,
});

const boxSides = (box) => {
  const row = Math.floor(box / BOXES);
  const column = box % BOXES;
  return [
    acrossLine(row, column),
    acrossLine(row + 1, column),
    downLine(row, column),
    downLine(row, column + 1),
  ];
};

// The one or two boxes a line is a side of
export function boxesBeside(line) {
  if (isAcross(line)) {
    const row = Math.floor(line / BOXES);
    const column = line % BOXES;
    const boxes = [];
    if (row > 0) boxes.push((row - 1) * BOXES + column);
    if (row < BOXES) boxes.push(row * BOXES + column);
    return boxes;
  }
  const row = Math.floor((line - ACROSS) / (BOXES + 1));
  const column = (line - ACROSS) % (BOXES + 1);
  const boxes = [];
  if (column > 0) boxes.push(row * BOXES + column - 1);
  if (column < BOXES) boxes.push(row * BOXES + column);
  return boxes;
}

export const canDraw = (game, line) =>
  Number.isInteger(line) && line >= 0 && line < LINES && game.lines[line] === null;

export const isOver = (game) => game.moves >= LINES;

// Draws line for player and fills in any box it closes. Closing one or two boxes earns another
// go, and anything else passes the turn. null if it isn't their go or the line's already there.
export function drawLine(game, line, player) {
  if (isOver(game) || game.turn !== player || !canDraw(game, line)) return null;
  const lines = [...game.lines];
  lines[line] = player;
  const boxes = [...game.boxes];
  let closed = 0;
  for (const box of boxesBeside(line)) {
    if (boxSides(box).every((side) => lines[side] !== null)) {
      boxes[box] = player;
      closed += 1;
    }
  }
  return { lines, boxes, moves: game.moves + 1, turn: closed ? player : 1 - player };
}

// How many boxes each has, as [the inviter's, the other's]
export const score = (game) =>
  game.boxes.reduce(
    ([first, second], owner) => [first + (owner === 0 ? 1 : 0), second + (owner === 1 ? 1 : 0)],
    [0, 0]
  );

// Where the arrow keys take the focus from line, or null for other keys. Left and right go along
// the row of lines it's in. Up and down step between the across lines and the down lines: down
// from the top of a box goes to its left side and then to its bottom, and up undoes that, so the
// right-hand edge is reached from the row beside it.
export function stepFocus(line, key) {
  if (isAcross(line)) {
    const row = Math.floor(line / BOXES);
    const column = line % BOXES;
    if (key === "ArrowLeft") return column > 0 ? line - 1 : line;
    if (key === "ArrowRight") return column < BOXES - 1 ? line + 1 : line;
    if (key === "ArrowUp") return row > 0 ? downLine(row - 1, column) : line;
    if (key === "ArrowDown") return row < BOXES ? downLine(row, column) : line;
    return null;
  }
  const row = Math.floor((line - ACROSS) / (BOXES + 1));
  const column = (line - ACROSS) % (BOXES + 1);
  // The down line on the right-hand edge has no box to its right, so it uses the one to its left
  const box = Math.min(column, BOXES - 1);
  if (key === "ArrowLeft") return column > 0 ? line - 1 : line;
  if (key === "ArrowRight") return column < BOXES ? line + 1 : line;
  if (key === "ArrowUp") return acrossLine(row, box);
  if (key === "ArrowDown") return acrossLine(row + 1, box);
  return null;
}
