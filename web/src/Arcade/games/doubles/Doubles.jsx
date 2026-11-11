import { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { GOAL, SIZE, biggest, newGame, slide } from "./doubles.js";
import { useFocusOnStart, useReducedMotion } from "../../../BenchGames/shared/skillCanvas.js";
import { Status } from "../../../BenchGames/shared/gameParts.jsx";
import { focusBlue, ink, pixel } from "../../../UserInterface/Modal.jsx";
import { readBest, saveBest } from "../../best.js";
import { EndBar, KeyHint, ScoreLine } from "../../arcadeParts.jsx";
import { useTouchScreen } from "../../arcadeHooks.js";

const BEST_KEY = "doubles";
const GAP = 10;
const SLIDE_MS = 110;
// A swipe shorter than this is a tap
const SHORTEST_SWIPE = 24;

const KEYS = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

// Pale sky to deep blue, through the blossom to crimson, then lantern gold, and ink past that
const TILE_COLOURS = {
  2: ["#F7FBFD", ink],
  4: ["#DCEFF8", ink],
  8: ["#A9DBF0", ink],
  16: ["#6FC0E3", ink],
  32: ["#3A9BD0", "#FFFFFF"],
  64: ["#3A55A4", "#FFFFFF"],
  128: ["#F4C6D6", ink],
  256: ["#E58FB0", ink],
  512: ["#D45D8C", "#FFFFFF"],
  1024: ["#C2334F", "#FFFFFF"],
  2048: ["#F2C14E", ink],
};
const coloursOf = (value) => TILE_COLOURS[value] ?? [ink, "#FFFFFF"];

const Doubles = () => {
  const [game, setGame] = useState(() => newGame(Math.random));
  const [best, setBest] = useState(() => readBest(BEST_KEY));
  // Whether the win has been seen, after which it carries on as before
  const [cheered, setCheered] = useState(false);
  const reduced = useReducedMotion();
  const touch = useTouchScreen();
  const boardRef = useRef(null);
  const swipe = useRef(null);
  useFocusOnStart(boardRef);

  useEffect(() => {
    saveBest(BEST_KEY, game.score);
  }, [game.score]);

  const cheering = game.won && !cheered;
  const move = (direction) => {
    if (cheering) return;
    setGame((current) => slide(current, direction, Math.random));
  };

  const restart = () => {
    setBest(readBest(BEST_KEY));
    setGame(newGame(Math.random));
    setCheered(false);
    boardRef.current?.focus();
  };

  const onKeyDown = (event) => {
    const direction = KEYS[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  };

  const onPointerDown = (event) => {
    swipe.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onPointerUp = (event) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SHORTEST_SWIPE) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  };

  const shown = [...game.gone.map((tile) => ({ ...tile, gone: true })), ...game.tiles];
  const newBest = game.score > best;

  return (
    <>
      <ScoreLine score={game.score} best={best} extra={`Biggest ${biggest(game)}`} />
      <Board
        ref={boardRef}
        tabIndex={0}
        role="group"
        aria-label={`Doubles board. Use the arrow keys or swipe to slide the tiles. Score ${game.score}.`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => (
          <Slot key={i} $row={Math.floor(i / SIZE)} $col={i % SIZE} />
        ))}
        {shown.map((tile) => {
          const [background, colour] = coloursOf(tile.value);
          return (
            <Tile key={tile.id} $row={tile.row} $col={tile.col} $gone={tile.gone} $still={reduced}>
              <Face
                key={tile.gone ? "gone" : tile.value}
                $background={background}
                $colour={colour}
                $digits={String(tile.value).length}
                $pop={
                  !reduced && !tile.gone && (tile.merged ? "merged" : tile.fresh ? "fresh" : null)
                }
              >
                {tile.value}
              </Face>
            </Tile>
          );
        })}
        {cheering && (
          <Cheer>
            <Status>You made {GOAL}!</Status>
            <EndBar
              label="Keep going"
              onPress={() => {
                setCheered(true);
                boardRef.current?.focus();
              }}
            />
          </Cheer>
        )}
      </Board>
      {!game.over && (
        <KeyHint>
          {touch ? "Swipe to slide every tile." : "Arrow keys or WASD slide every tile."} Two the
          same join into one.
        </KeyHint>
      )}
      {game.over && (
        <EndBar
          note={`${newBest ? "A new best! " : "No moves left. "}Your biggest tile was ${biggest(game)}.`}
          onPress={restart}
        />
      )}
    </>
  );
};

const Board = styled.div`
  position: relative;
  width: min(100%, 420px, calc(100dvh - 400px));
  aspect-ratio: 1;
  margin: 0 auto;
  padding: ${GAP}px;
  border-radius: 14px;
  background: #3a4f86;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 3px;
  }
`;

// Each square is a quarter of the board less its share of the gaps
const square = css`
  position: absolute;
  top: ${GAP}px;
  left: ${GAP}px;
  width: calc((100% - ${GAP * (SIZE + 1)}px) / ${SIZE});
  height: calc((100% - ${GAP * (SIZE + 1)}px) / ${SIZE});
  transform: ${({ $row, $col }) =>
    `translate(calc(${$col} * (100% + ${GAP}px)), calc(${$row} * (100% + ${GAP}px)))`};
`;

const Slot = styled.div`
  ${square}
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.14);
`;

const Tile = styled.div`
  ${square}
  z-index: ${({ $gone }) => ($gone ? 1 : 2)};
  transition: ${({ $still }) => ($still ? "none" : `transform ${SLIDE_MS}ms ease-in-out`)};
`;

const appear = keyframes`
  from { transform: scale(0); }
  to { transform: scale(1); }
`;

const pop = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.14); }
  100% { transform: scale(1); }
`;

// The number's size by how many digits it has
const FACE_SIZES = [40, 40, 34, 28, 22];
const PHONE_FACE_SIZES = [30, 30, 26, 20, 16];

const Face = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background: ${({ $background }) => $background};
  color: ${({ $colour }) => $colour};
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.15);
  font: 600 ${({ $digits }) => FACE_SIZES[Math.min($digits, 5) - 1]}px / 1 ${pixel};
  font-variant-ligatures: none;
  animation: ${({ $pop }) =>
    $pop === "fresh"
      ? css`
          ${appear} ${SLIDE_MS}ms ease-out ${SLIDE_MS}ms both
        `
      : $pop === "merged"
        ? css`
            ${pop} ${SLIDE_MS * 1.5}ms ease-out ${SLIDE_MS}ms
          `
        : "none"};

  @media (max-width: 520px) {
    font-size: ${({ $digits }) => PHONE_FACE_SIZES[Math.min($digits, 5) - 1]}px;
  }
`;

const Cheer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(247, 251, 253, 0.82);
`;

export default Doubles;
