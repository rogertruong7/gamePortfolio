import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  POINTS,
  SIZE,
  canPlace,
  emptyBoard,
  isFull,
  place,
  rowThrough,
  stepFocus,
  turnAfter,
} from "./gomoku.js";
import { crimson, focusBlue, ink } from "../UserInterface/Modal.jsx";
import { AgainBar, Status } from "./gameParts.jsx";

// The one who sent the invite plays the dark stones and the other the light ones
const STONES = [ink, "#FBFAF5"];
const CENTRE = Math.floor(POINTS / 2);

const FiveInARow = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  // row is the winning row once there is one, kept so it isn't searched for on every render
  const [game, setGame] = useState({ board: emptyBoard(), moves: 0, last: null, row: null });
  const gameRef = useRef(game);
  const [focus, setFocus] = useState(CENTRE);
  const [note, setNote] = useState("");
  const board = useRef(null);

  const put = useCallback((point, player) => {
    const current = gameRef.current;
    const next = place(current.board, point, player);
    if (!next) return;
    const row = rowThrough(next, point);
    const won = row && { player, points: row };
    const updated = { board: next, moves: current.moves + 1, last: point, row: won };
    gameRef.current = updated;
    setGame(updated);
  }, []);

  const over = Boolean(game.row) || isFull(game.board);
  const myTurn = !over && turnAfter(game.moves, match) === me;

  useEffect(() => {
    board.current?.querySelector(`[data-point="${CENTRE}"]`)?.focus();
  }, []);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const current = gameRef.current;
        const { n, p } = message.data;
        // Only the next move counts, so a repeat or a stray from earlier changes nothing
        if (n !== current.moves || current.row || isFull(current.board)) return;
        if (turnAfter(current.moves, match) === me || !canPlace(current.board, p)) return;
        put(p, 1 - me);
      }),
    [listenMoves, match, me, put]
  );

  const play = (point) => {
    // The ref, not this render's game, so two quick taps can't both count as this player's go
    const current = gameRef.current;
    if (current.row || isFull(current.board)) return;
    if (turnAfter(current.moves, match) !== me || !canPlace(current.board, point)) return;
    if (!sendMove("play", { data: { n: current.moves, p: point } })) {
      setNote("That didn't go through. Try again.");
      return;
    }
    setNote("");
    put(point, me);
  };

  // The arrow keys move round the board, and Enter or Space places a stone on the focused point
  const onKeyDown = (event) => {
    const next = stepFocus(focus, event.key);
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    board.current?.querySelector(`[data-point="${next}"]`)?.focus();
  };

  const inRow = (point) => game.row?.points.includes(point);
  const status = game.row
    ? game.row.player === me
      ? "Five in a row. You win!"
      : `${partnerName} got five in a row.`
    : over
      ? "The board's full. It's a draw."
      : myTurn
        ? "Your turn. Place a stone."
        : `${partnerName} is thinking…`;

  const describe = (point) => {
    const stone = game.board[point];
    const where = `Row ${Math.floor(point / SIZE) + 1}, column ${(point % SIZE) + 1}`;
    if (stone === null) return where;
    return `${where}, ${stone === me ? "your stone" : `${partnerName}'s stone`}`;
  };

  return (
    <>
      <Status aria-live="polite">
        <Stone $player={me} $small aria-hidden="true" /> {status}
      </Status>
      {note && <Note role="alert">{note}</Note>}
      <Board ref={board} role="group" aria-label="Five in a Row board" onKeyDown={onKeyDown}>
        {game.board.map((stone, point) => (
          <Point
            key={point}
            type="button"
            data-point={point}
            tabIndex={point === focus ? 0 : -1}
            $column={point % SIZE}
            $row={Math.floor(point / SIZE)}
            $active={myTurn && stone === null}
            aria-disabled={!myTurn || stone !== null}
            aria-label={describe(point)}
            onFocus={() => setFocus(point)}
            onClick={() => play(point)}
          >
            {stone !== null && (
              <Stone $player={stone} $row={inRow(point)} $last={point === game.last} />
            )}
          </Point>
        ))}
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

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  width: min(100%, 500px);
  margin: 0 auto;
  padding: 8px;
  border-radius: 12px;
  background: #e9c77b;
  box-shadow: inset 0 0 0 2px #b88a3a;
  touch-action: manipulation;
`;

// Each point is a square with the grid lines crossing in its middle. The lines stop at the
// middle on the outside edge, so the board has a border rather than lines poking off it.
const Point = styled.button`
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: ${({ $active }) => ($active ? "pointer" : "default")};

  &::before,
  &::after {
    content: "";
    position: absolute;
    background: #7a5520;
    pointer-events: none;
  }

  &::before {
    top: 50%;
    height: 1px;
    left: ${({ $column }) => ($column === 0 ? "50%" : "0")};
    right: ${({ $column }) => ($column === SIZE - 1 ? "50%" : "0")};
  }

  &::after {
    left: 50%;
    width: 1px;
    top: ${({ $row }) => ($row === 0 ? "50%" : "0")};
    bottom: ${({ $row }) => ($row === SIZE - 1 ? "50%" : "0")};
  }

  &:hover {
    background: ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.35)" : "transparent")};
    border-radius: 50%;
  }

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: -2px;
    border-radius: 50%;
    z-index: 2;
  }
`;

const settle = keyframes`
  from {
    transform: scale(1.35);
    opacity: 0.4;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

const Stone = styled.span`
  position: ${({ $small }) => ($small ? "static" : "absolute")};
  inset: 8%;
  z-index: 1;
  display: ${({ $small }) => ($small ? "inline-block" : "block")};
  width: ${({ $small }) => ($small ? "18px" : "auto")};
  height: ${({ $small }) => ($small ? "18px" : "auto")};
  vertical-align: -3px;
  border-radius: 50%;
  background: ${({ $player }) => STONES[$player]};
  box-shadow:
    inset 0 -2px 0 rgba(0, 0, 0, 0.25),
    ${({ $row }) => ($row ? `0 0 0 3px ${focusBlue}` : "0 1px 2px rgba(0, 0, 0, 0.35)")};
  animation: ${settle} 0.2s ease-out;
  ${({ $small }) => $small && "animation: none;"}

  /* A small dot marks the stone placed last, so it's easy to see where they just went */
  &::after {
    content: "";
    display: ${({ $last }) => ($last ? "block" : "none")};
    position: absolute;
    inset: 36%;
    border-radius: 50%;
    background: ${({ $player }) => STONES[1 - $player]};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export default FiveInARow;
