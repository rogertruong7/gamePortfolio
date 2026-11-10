import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  BOXES,
  LINES,
  acrossLine,
  downLine,
  drawLine,
  isOver,
  newGame,
  score,
  stepFocus,
} from "./dots.js";
import { crimson, focusBlue, ink } from "../../../UserInterface/Modal.jsx";
import { AgainBar, Score, Status } from "../../shared/gameParts.jsx";

// The one who sent the invite draws in crimson, and the other in teal
const COLOURS = [crimson, "#17877A"];
const TINTS = ["rgba(168, 18, 63, 0.22)", "rgba(23, 135, 122, 0.24)"];

// The board is laid out as a grid of dots, lines and boxes, BOXES * 2 + 1 tracks each way: the
// even tracks are dots and the lines that run along them, and the odd ones the boxes and the lines
// that run across them
const TRACKS = BOXES * 2 + 1;

const DotsAndBoxes = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  const [game, setGame] = useState(() => ({ ...newGame(match), last: null }));
  const gameRef = useRef(game);
  const [focus, setFocus] = useState(0);
  const [note, setNote] = useState("");
  const board = useRef(null);

  const apply = useCallback((line, player) => {
    const next = drawLine(gameRef.current, line, player);
    if (!next) return false;
    const updated = { ...next, last: line };
    gameRef.current = updated;
    setGame(updated);
    return true;
  }, []);

  const over = isOver(game);
  const myTurn = !over && game.turn === me;
  const [first, second] = score(game);
  const mine = me === 0 ? first : second;
  const theirs = me === 0 ? second : first;

  useEffect(() => {
    board.current?.querySelector('[data-line="0"]')?.focus();
  }, []);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const current = gameRef.current;
        const { n, l } = message.data;
        // Only the next line counts, so a repeat or a stray from earlier changes nothing.
        // drawLine checks it's their go and the line is free.
        if (n !== current.moves || current.turn === me) return;
        apply(l, 1 - me);
      }),
    [listenMoves, match, me, apply]
  );

  const draw = (line) => {
    // The ref, not this render's game, so two quick taps can't both count as this player's go
    const current = gameRef.current;
    if (!drawLine(current, line, me)) return;
    if (!sendMove("play", { data: { n: current.moves, l: line } })) {
      setNote("That didn't go through. Try again.");
      return;
    }
    setNote("");
    apply(line, me);
  };

  // The arrow keys move between the lines, and Enter or Space draws the focused one
  const onKeyDown = (event) => {
    const next = stepFocus(focus, event.key);
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    board.current?.querySelector(`[data-line="${next}"]`)?.focus();
  };

  const closedOne = game.last !== null && game.lines[game.last] === game.turn && game.moves > 0;
  const status = over
    ? mine > theirs
      ? "You win!"
      : `${partnerName} wins.`
    : myTurn
      ? closedOne
        ? "Box! Go again."
        : "Your turn. Draw a line."
      : closedOne
        ? `${partnerName} got a box and goes again…`
        : `${partnerName} is thinking…`;

  const lineButton = (line, across, row, column, label) => {
    const owner = game.lines[line];
    return (
      <Line
        key={`l${line}`}
        type="button"
        data-line={line}
        tabIndex={line === focus ? 0 : -1}
        style={{ gridRow: row + 1, gridColumn: column + 1 }}
        $across={across}
        $owner={owner}
        $last={line === game.last}
        $active={myTurn && owner === null}
        aria-disabled={!myTurn || owner !== null}
        aria-label={`${label}${owner === null ? "" : ", drawn"}`}
        onFocus={() => setFocus(line)}
        onClick={() => draw(line)}
      />
    );
  };

  const cells = [];
  for (let row = 0; row < TRACKS; row += 1) {
    for (let column = 0; column < TRACKS; column += 1) {
      const place = { gridRow: row + 1, gridColumn: column + 1 };
      const evenRow = row % 2 === 0;
      const evenColumn = column % 2 === 0;
      if (evenRow && evenColumn) {
        cells.push(<Dot key={`d${row}-${column}`} style={place} aria-hidden="true" />);
      } else if (evenRow) {
        const from = (column - 1) / 2 + 1;
        const label = `Across line ${row / 2 + 1}, from dot ${from} to ${from + 1}`;
        cells.push(lineButton(acrossLine(row / 2, from - 1), true, row, column, label));
      } else if (evenColumn) {
        const from = (row - 1) / 2 + 1;
        const label = `Down line ${column / 2 + 1}, from dot ${from} to ${from + 1}`;
        cells.push(lineButton(downLine(from - 1, column / 2), false, row, column, label));
      } else {
        const box = ((row - 1) / 2) * BOXES + (column - 1) / 2;
        const owner = game.boxes[box];
        cells.push(
          <Box key={`b${box}-${owner}`} style={place} $owner={owner} aria-hidden="true">
            {owner !== null && (owner === me ? "You" : partnerName.slice(0, 1).toUpperCase())}
          </Box>
        );
      }
    }
  }

  return (
    <>
      <Score>
        You {mine} – {theirs} {partnerName}
      </Score>
      <Status aria-live="polite">
        <Swatch $player={me} aria-hidden="true" /> {status}
      </Status>
      {note && <Note role="alert">{note}</Note>}
      <Board
        ref={board}
        role="group"
        aria-label={`Dots and Boxes board, ${LINES - game.moves} lines left`}
        onKeyDown={onKeyDown}
      >
        {cells}
      </Board>
      {over && <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />}
    </>
  );
};

const Note = styled.p`
  margin: -8px 0 12px;
  text-align: center;
  color: ${crimson};
  font-weight: 700;
`;

const Swatch = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  vertical-align: -3px;
  border-radius: 4px;
  background: ${({ $player }) => COLOURS[$player]};
`;

// The dot tracks are thin and the box tracks share out the rest, so the boxes stay square
const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(${BOXES}, 16px 1fr) 16px;
  grid-template-rows: repeat(${BOXES}, 16px 1fr) 16px;
  aspect-ratio: 1;
  width: min(100%, 420px);
  margin: 0 auto;
  padding: 10px;
  border-radius: 14px;
  background: #f4f1e6;
  box-shadow: inset 0 0 0 2px #d9d2bb;
  touch-action: manipulation;
`;

const Dot = styled.span`
  z-index: 2;
  margin: 3px;
  border-radius: 50%;
  background: ${ink};
  pointer-events: none;
`;

const drawIn = keyframes`
  from {
    transform: scale(0.2);
  }
  to {
    transform: scale(1);
  }
`;

// The drawn bar is thin, but the button reaches a little into the boxes either side so it's easy
// to hit with a finger
const Line = styled.button`
  position: relative;
  z-index: 1;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: ${({ $active }) => ($active ? "pointer" : "default")};

  &::before {
    content: "";
    position: absolute;
    inset: ${({ $across }) => ($across ? "-6px 0" : "0 -6px")};
  }

  &::after {
    content: "";
    position: absolute;
    inset: ${({ $across }) => ($across ? "5px -2px" : "-2px 5px")};
    border-radius: 3px;
    background: ${({ $owner }) => ($owner === null ? "rgba(20, 35, 90, 0.08)" : COLOURS[$owner])};
    box-shadow: ${({ $last }) => ($last ? `0 0 0 2px #fff, 0 0 0 4px ${ink}` : "none")};
  }

  ${({ $owner, $active }) =>
    $owner === null && $active && "&:hover::after { background: rgba(20, 35, 90, 0.3); }"}

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
    border-radius: 4px;
    z-index: 3;
  }
`;

const Box = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2px;
  border-radius: 4px;
  overflow: hidden;
  font-weight: 700;
  font-size: clamp(10px, 3vw, 15px);
  color: ${({ $owner }) => ($owner === null ? "transparent" : COLOURS[$owner])};
  background: ${({ $owner }) => ($owner === null ? "transparent" : TINTS[$owner])};
  animation: ${drawIn} 0.25s ease-out;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export default DotsAndBoxes;
