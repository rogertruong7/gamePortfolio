import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  QUIET_LIMIT,
  SIZE,
  SQUARES,
  isDark,
  legalMoves,
  movesStartingWith,
  newGame,
  piecesLeft,
  play,
  result,
  stepFocus,
  turnOf,
  viewSquare,
} from "./checkers.js";
import { crimson, focusBlue } from "../UserInterface/Modal.jsx";
import { AgainBar, Score, Status } from "./gameParts.jsx";

// The one who sent the invite plays crimson and the other cream
const PIECES = [crimson, "#F3E7CC"];
const RIMS = ["#6E0A28", "#B59A62"];
// A faint ring round the pieces that can move, which matters most when a take is compulsory
const HINT_RING = "0 0 0 2px rgba(255, 255, 255, 0.45)";
// The bottom left square, which is a dark one whichever way round the board is
const START_FOCUS = SQUARES - SIZE;

const Checkers = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  const flipped = me === 1;
  const [game, setGame] = useState(() => ({ ...newGame(match), last: [] }));
  const gameRef = useRef(game);
  // The squares of the move being picked: the piece first, then each landing so far
  const [picked, setPicked] = useState([]);
  const [focus, setFocus] = useState(START_FOCUS);
  const [note, setNote] = useState("");
  const board = useRef(null);

  const apply = useCallback((path) => {
    const next = play(gameRef.current, path);
    if (!next) return false;
    const updated = { ...next, last: path };
    gameRef.current = updated;
    setGame(updated);
    return true;
  }, []);

  const outcome = result(game);
  const myTurn = !outcome && turnOf(game) === me;
  const moves = myTurn ? legalMoves(game.board, me) : [];
  const mustTake = moves.some((move) => move.taken.length > 0);
  const options = picked.length ? movesStartingWith(game.board, me, picked) : [];
  const landings = new Set(options.map((move) => move.path[picked.length]));
  const movable = new Set(moves.map((move) => move.path[0]));

  useEffect(() => {
    board.current?.querySelector(`[data-view="${START_FOCUS}"]`)?.focus();
  }, []);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const current = gameRef.current;
        const { n, p } = message.data;
        // Only the next move counts, so a repeat or a stray from earlier changes nothing.
        // play checks the whole path is a legal move for them.
        if (n !== current.moves || turnOf(current) === me || result(current)) return;
        if (Array.isArray(p) && apply(p)) setPicked([]);
      }),
    [listenMoves, match, me, apply]
  );

  const send = (path) => {
    const current = gameRef.current;
    if (turnOf(current) !== me || !play(current, path)) return;
    if (!sendMove("play", { data: { n: current.moves, p: path } })) {
      setNote("That didn't go through. Try again.");
      setPicked([]);
      return;
    }
    setNote("");
    setPicked([]);
    apply(path);
  };

  const choose = (square) => {
    if (!myTurn) return;
    if (picked.length && landings.has(square)) {
      const path = [...picked, square];
      const finished = options.find((move) => move.path.length === path.length);
      if (finished) send(path);
      else setPicked(path);
      return;
    }
    // Picking another piece starts again, but not once a jump is under way
    if (picked.length > 1) return;
    if (movable.has(square)) setPicked(square === picked[0] ? [] : [square]);
    else if (game.board[square]?.player === me && mustTake) setNote("You have to take a piece.");
  };

  // The arrow keys move round the board as this player sees it. Enter or Space picks a piece or
  // a square to move to, and Escape puts the piece back.
  const onKeyDown = (event) => {
    if (event.key === "Escape" && picked.length) {
      event.preventDefault();
      event.stopPropagation();
      setPicked([]);
      return;
    }
    const next = stepFocus(focus, event.key);
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    board.current?.querySelector(`[data-view="${next}"]`)?.focus();
  };

  const lastFrom = game.last[0];
  const lastTo = game.last[game.last.length - 1];

  let status;
  if (outcome) {
    if (outcome.winner === null) status = `No takes in ${QUIET_LIMIT / 2} moves each. A draw.`;
    else status = outcome.winner === me ? "You win!" : `${partnerName} wins.`;
  } else if (!myTurn) {
    status = `${partnerName} is thinking…`;
  } else if (picked.length > 1) {
    status = "Keep jumping!";
  } else if (picked.length) {
    status = "Now pick where it goes.";
  } else {
    status = mustTake ? "Your turn. You have to take." : "Your turn. Pick a piece.";
  }

  const describe = (square) => {
    const row = SIZE - Math.floor(viewSquare(square, flipped) / SIZE);
    const column = "abcdefgh"[viewSquare(square, flipped) % SIZE];
    const piece = game.board[square];
    let what = "empty";
    if (piece) {
      const owner = piece.player === me ? "your" : `${partnerName}'s`;
      what = `${owner} ${piece.king ? "king" : "piece"}`;
    }
    const extra = picked[0] === square ? ", picked" : landings.has(square) ? ", move here" : "";
    return `${column}${row}, ${what}${extra}`;
  };

  return (
    <>
      <Score>
        You {piecesLeft(game.board, me)} · {partnerName} {piecesLeft(game.board, 1 - me)}
      </Score>
      <Status aria-live="polite">
        <Piece $player={me} $small aria-hidden="true" /> {status}
      </Status>
      {note && <Note role="alert">{note}</Note>}
      <Board ref={board} role="group" aria-label="Checkers board" onKeyDown={onKeyDown}>
        {Array.from({ length: SQUARES }, (_, view) => {
          const square = viewSquare(view, flipped);
          const dark = isDark(square);
          const piece = game.board[square];
          const canPick = picked.length < 2 && movable.has(square);
          const active = myTurn && (landings.has(square) || canPick);
          return (
            <Square
              key={view}
              type="button"
              data-view={view}
              tabIndex={view === focus ? 0 : -1}
              $dark={dark}
              $active={active}
              $last={square === lastFrom || square === lastTo}
              $trail={picked.includes(square) && square !== picked[0]}
              aria-disabled={!active}
              aria-label={dark ? describe(square) : "Light square"}
              onFocus={() => setFocus(view)}
              onClick={() => choose(square)}
            >
              {piece && (
                <Piece
                  key={square === lastTo ? `moved-${game.moves}` : "still"}
                  $player={piece.player}
                  $picked={picked[0] === square}
                  $hint={!picked.length && movable.has(square)}
                >
                  {piece.king && <Crown aria-hidden="true">♛</Crown>}
                </Piece>
              )}
              {!piece && landings.has(square) && <Landing aria-hidden="true" />}
            </Square>
          );
        })}
      </Board>
      {outcome && <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />}
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
  width: min(100%, 440px);
  margin: 0 auto;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: 0 0 0 4px #1b2f5e;
  touch-action: manipulation;
`;

const Square = styled.button`
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  background: ${({ $dark, $last, $trail }) =>
    !$dark ? "#DCE6F2" : $trail ? "#4E7BC9" : $last ? "#3D5F9E" : "#2B467E"};
  cursor: ${({ $active }) => ($active ? "pointer" : "default")};

  &:hover {
    filter: ${({ $active }) => ($active ? "brightness(1.2)" : "none")};
  }

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: -3px;
    z-index: 1;
  }
`;

const land = keyframes`
  from {
    transform: scale(1.25);
  }
  to {
    transform: scale(1);
  }
`;

const Piece = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  position: ${({ $small }) => ($small ? "static" : "absolute")};
  inset: 12%;
  width: ${({ $small }) => ($small ? "18px" : "auto")};
  height: ${({ $small }) => ($small ? "18px" : "auto")};
  vertical-align: -3px;
  border-radius: 50%;
  background: ${({ $player }) => PIECES[$player]};
  box-shadow:
    inset 0 0 0 3px ${({ $player }) => RIMS[$player]},
    inset 0 -3px 0 3px rgba(0, 0, 0, 0.18),
    ${({ $picked, $hint }) =>
      $picked ? "0 0 0 3px #fff" : $hint ? HINT_RING : "0 0 0 0 transparent"};
  animation: ${land} 0.2s ease-out;
  ${({ $small }) => $small && "display: inline-block; animation: none;"}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Crown = styled.span`
  font-size: clamp(14px, 4.5vw, 26px);
  line-height: 1;
  color: #e8b21f;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
`;

const Landing = styled.span`
  position: absolute;
  inset: 36%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
`;

export default Checkers;
