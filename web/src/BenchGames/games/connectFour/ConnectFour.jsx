import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  COLUMNS,
  ROWS,
  canDrop,
  drop,
  emptyBoard,
  findLine,
  isFull,
  turnAfter,
} from "./connectFourBoard.js";
import { crimson } from "../../../UserInterface/Modal.jsx";
import { AgainBar, Status } from "../../shared/gameParts.jsx";

// The one who sent the invite plays in crimson, and the other in gold
const discColour = (player) => (player === 0 ? crimson : "#E8B21F");

const ConnectFour = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  const [game, setGame] = useState({ board: emptyBoard(), moves: 0 });
  const gameRef = useRef(game);
  const firstColumn = useRef(null);

  const place = useCallback((column, player) => {
    const current = gameRef.current;
    const board = drop(current.board, column, player);
    if (!board) return false;
    const next = { board, moves: current.moves + 1 };
    gameRef.current = next;
    setGame(next);
    return true;
  }, []);

  const line = findLine(game.board);
  const over = Boolean(line) || isFull(game.board);
  const turn = turnAfter(game.moves, match);
  const myTurn = !over && turn === me;

  useEffect(() => {
    firstColumn.current?.focus();
  }, []);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const current = gameRef.current;
        if (message.kind !== "drop" || message.move !== current.moves) return;
        if (findLine(current.board) || turnAfter(current.moves, match) === me) return;
        if (canDrop(current.board, message.column)) place(message.column, 1 - me);
      }),
    [listenMoves, match, me, place]
  );

  const play = (column) => {
    // The ref, not this render's game, so two quick clicks can't both count as this player's go
    const current = gameRef.current;
    if (findLine(current.board) || isFull(current.board)) return;
    if (turnAfter(current.moves, match) !== me || !canDrop(current.board, column)) return;
    const move = current.moves;
    if (place(column, me)) sendMove("drop", { move, column });
  };

  // Left and right move along the columns, and Enter or Space drops a disc in the focused one
  const onKeyDown = (event) => {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.querySelectorAll("button")];
    const at = buttons.indexOf(document.activeElement);
    buttons[(at + step + COLUMNS) % COLUMNS]?.focus();
  };

  const inLine = (column, row) => line?.cells.some(([c, r]) => c === column && r === row);
  const status = line
    ? line.player === me
      ? "You win!"
      : `${partnerName} wins.`
    : over
      ? "It's a draw."
      : myTurn
        ? "Your turn. Pick a column."
        : `${partnerName} is thinking…`;

  return (
    <>
      <Status>
        <Disc $player={me} $small aria-hidden="true" /> {status}
      </Status>
      <Board onKeyDown={onKeyDown} role="group" aria-label="Connect Four board">
        {game.board.map((discs, column) => (
          <Column
            key={column}
            ref={column === 0 ? firstColumn : undefined}
            type="button"
            $active={myTurn && discs.length < ROWS}
            aria-disabled={!myTurn || discs.length >= ROWS}
            aria-label={`Drop a disc in column ${column + 1}`}
            onClick={() => play(column)}
          >
            {Array.from({ length: ROWS }, (_, row) => (
              <Cell key={row}>
                {discs[row] !== undefined && (
                  <Disc $player={discs[row]} $line={inLine(column, row)} />
                )}
              </Cell>
            ))}
          </Column>
        ))}
      </Board>
      {over && <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />}
    </>
  );
};

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(${COLUMNS}, 1fr);
  gap: 6px;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: 10px;
  border-radius: 14px;
  background: #1f4fa8;
`;

// The rows stack from the bottom, as the discs fall
const Column = styled.button`
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  padding: 4px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: ${({ $active }) => ($active ? "pointer" : "default")};

  &:hover {
    background: ${({ $active }) => ($active ? "rgba(255, 255, 255, 0.18)" : "transparent")};
  }
`;

const Cell = styled.span`
  display: block;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #0e2a63;
`;

const fall = keyframes`
  from {
    transform: translateY(-420%);
  }
  to {
    transform: translateY(0);
  }
`;

const Disc = styled.span`
  animation: ${fall} 0.35s ease-in;
  ${({ $small }) => $small && "animation: none;"}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  display: ${({ $small }) => ($small ? "inline-block" : "block")};
  width: ${({ $small }) => ($small ? "18px" : "100%")};
  height: ${({ $small }) => ($small ? "18px" : "100%")};
  vertical-align: -3px;
  border-radius: 50%;
  background: ${({ $player }) => discColour($player)};
  box-shadow:
    inset 0 -3px 0 rgba(0, 0, 0, 0.25),
    ${({ $line }) => ($line ? "0 0 0 3px #fff" : "0 0 0 0 transparent")};
`;

export default ConnectFour;
