import { useCallback, useRef, useState } from "react";
import {
  HEIGHT,
  LOCK_MS,
  SHOWN_NEXT,
  WIDTH,
  cellsOf,
  hardDrop,
  hold,
  landing,
  newGame,
  rotate,
  shift,
  squaresOf,
  tick,
} from "./blockDrop.js";
import { useCanvas, useFocusOnStart } from "../../../BenchGames/shared/skillCanvas.js";
import { body, ink, inkSoft } from "../../../UserInterface/Modal.jsx";
import { readBest, saveBest } from "../../best.js";
import { ArcadeCanvas, EndBar, KeyHint, RestartBar, TouchPad } from "../../arcadeParts.jsx";
import { useHoldToRestart, usePauseWhenHidden, useTouchScreen } from "../../arcadeHooks.js";

const CELL = 24;
const BOARD_WIDTH = WIDTH * CELL;
const PANEL_X = BOARD_WIDTH + 14;
const VIEW = { width: BOARD_WIDTH + 124, height: HEIGHT * CELL };
const MINI = 14;
// Holding left or right moves once, waits this long, then keeps going every REPEAT_MS
const SHIFT_DELAY_MS = 170;
const REPEAT_MS = 45;
const BEST_KEY = "blockdrop";

// Colours from the town: sky, lantern gold, blossom, moss, crimson, ink and wisteria
const COLOURS = {
  I: "#5DB8E0",
  O: "#F2C14E",
  T: "#E58FB0",
  S: "#7FB069",
  Z: "#C2334F",
  J: "#3A55A4",
  L: "#9C7BC9",
};

function drawSquare(context, x, y, size, colour) {
  context.fillStyle = colour;
  context.fillRect(x, y, size, size);
  // A lighter top edge and a darker bottom, so each square reads as a block
  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.fillRect(x, y, size, size * 0.18);
  context.fillStyle = "rgba(0, 0, 0, 0.18)";
  context.fillRect(x, y + size * 0.82, size, size * 0.18);
  context.strokeStyle = "rgba(20, 35, 90, 0.55)";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

// A piece on its own, centred in a box, for the held and coming-up pieces
function drawMini(context, type, centreX, centreY, faded) {
  const cells = cellsOf(type, 0);
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const across = (Math.max(...xs) - Math.min(...xs) + 1) * MINI;
  const down = (Math.max(...ys) - Math.min(...ys) + 1) * MINI;
  context.globalAlpha = faded ? 0.35 : 1;
  for (const [x, y] of cells) {
    drawSquare(
      context,
      centreX - across / 2 + (x - Math.min(...xs)) * MINI,
      centreY - down / 2 + (y - Math.min(...ys)) * MINI,
      MINI,
      COLOURS[type]
    );
  }
  context.globalAlpha = 1;
}

function drawLabel(context, text, y) {
  context.fillStyle = inkSoft;
  context.font = `700 14px ${body}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(text, PANEL_X, y);
}

function drawNumber(context, value, y) {
  context.fillStyle = ink;
  context.font = `700 20px ${body}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(String(value), PANEL_X, y);
}

function drawGame(context, game, best) {
  // The well
  context.fillStyle = "#E6F0F6";
  context.fillRect(0, 0, BOARD_WIDTH, VIEW.height);
  context.strokeStyle = "rgba(20, 35, 90, 0.07)";
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 1; x < WIDTH; x += 1) {
    context.moveTo(x * CELL + 0.5, 0);
    context.lineTo(x * CELL + 0.5, VIEW.height);
  }
  for (let y = 1; y < HEIGHT; y += 1) {
    context.moveTo(0, y * CELL + 0.5);
    context.lineTo(BOARD_WIDTH, y * CELL + 0.5);
  }
  context.stroke();

  game.board.forEach((type, i) => {
    if (type)
      drawSquare(context, (i % WIDTH) * CELL, Math.floor(i / WIDTH) * CELL, CELL, COLOURS[type]);
  });

  if (!game.over) {
    // Where it'll land, as an outline
    context.strokeStyle = COLOURS[game.piece.type];
    context.lineWidth = 2;
    for (const [x, y] of squaresOf(landing(game))) {
      if (y >= 0) context.strokeRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
    }
    // A resting piece fades a little as its lock runs down
    context.globalAlpha = 1 - (game.lockMs / LOCK_MS) * 0.35;
    for (const [x, y] of squaresOf(game.piece)) {
      if (y >= 0) drawSquare(context, x * CELL, y * CELL, CELL, COLOURS[game.piece.type]);
    }
    context.globalAlpha = 1;
  }

  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.strokeRect(1, 1, BOARD_WIDTH - 2, VIEW.height - 2);

  // The panel beside it
  drawLabel(context, "Hold", 4);
  if (game.hold) drawMini(context, game.hold, PANEL_X + 46, 46, !game.canHold);
  drawLabel(context, "Next", 82);
  game.queue
    .slice(0, SHOWN_NEXT)
    .forEach((type, i) => drawMini(context, type, PANEL_X + 46, 122 + i * 52, false));
  drawLabel(context, "Score", 286);
  drawNumber(context, game.score, 304);
  drawLabel(context, "Lines", 336);
  drawNumber(context, game.lines, 354);
  drawLabel(context, "Level", 386);
  drawNumber(context, game.level, 404);
  drawLabel(context, "Best", 436);
  drawNumber(context, Math.max(best, game.score), 454);
}

const BlockDrop = () => {
  const [phase, setPhase] = useState("playing");
  const [best, setBest] = useState(() => readBest(BEST_KEY));
  const [newBest, setNewBest] = useState(false);
  const touch = useTouchScreen();
  const run = useRef(null);
  if (!run.current) {
    run.current = { game: newGame(Math.random), last: null, down: false, sideways: null };
  }

  const finish = useCallback((game) => {
    setNewBest(saveBest(BEST_KEY, game.score));
    setBest(readBest(BEST_KEY));
    setPhase("over");
  }, []);

  // Each player action goes through here, so a piece that lands and ends it is caught at once
  const act = useCallback(
    (change) => {
      const r = run.current;
      if (r.game.over) return;
      r.game = change(r.game);
      if (r.game.over) finish(r.game);
    },
    [finish]
  );

  const draw = (context, now) => {
    const r = run.current;
    if (phase === "playing" && !r.game.over) {
      const ms = r.last === null ? 0 : Math.min(100, now - r.last);
      r.last = now;
      const side = r.sideways;
      if (side && now >= side.at) {
        r.game = shift(r.game, side.dir);
        side.at = now + REPEAT_MS;
      }
      r.game = tick(r.game, ms, r.down, Math.random);
      if (r.game.over) finish(r.game);
    }
    drawGame(context, r.game, best);
    return phase === "playing" && !r.game.over;
  };
  const { canvasRef } = useCanvas(VIEW.width, VIEW.height, draw);
  useFocusOnStart(canvasRef);

  const pause = useCallback(() => {
    setPhase((current) => (current === "playing" ? "paused" : current));
    run.current.down = false;
    run.current.sideways = null;
  }, []);
  usePauseWhenHidden(pause);

  const resume = () => {
    run.current.last = null;
    setPhase("playing");
    canvasRef.current?.focus();
  };

  const restart = () => {
    run.current = { game: newGame(Math.random), last: null, down: false, sideways: null };
    setNewBest(false);
    resume();
  };
  const holdR = useHoldToRestart(restart);

  const startSideways = (dir) => {
    act((game) => shift(game, dir));
    run.current.sideways = { dir, at: performance.now() + SHIFT_DELAY_MS };
  };
  const stopSideways = (dir) => {
    if (run.current.sideways?.dir === dir) run.current.sideways = null;
  };

  const onKeyDown = (event) => {
    if (holdR.keyDown(event)) return;
    const key = event.key.toLowerCase();
    if (key === "p") {
      event.preventDefault();
      if (phase === "playing") pause();
      else if (phase === "paused") resume();
      return;
    }
    if (phase !== "playing") return;
    const handled = [
      "arrowleft",
      "arrowright",
      "arrowdown",
      "arrowup",
      " ",
      "x",
      "z",
      "c",
      "shift",
      "a",
      "d",
      "s",
      "w",
    ];
    if (!handled.includes(key)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (key === "arrowleft" || key === "a") startSideways(-1);
    if (key === "arrowright" || key === "d") startSideways(1);
    if (key === "arrowdown" || key === "s") run.current.down = true;
    if (key === "arrowup" || key === "x" || key === "w") act((game) => rotate(game, 1));
    if (key === "z") act((game) => rotate(game, -1));
    if (key === " ") act((game) => hardDrop(game, Math.random));
    if (key === "c" || key === "shift") act((game) => hold(game, Math.random));
  };

  const onKeyUp = (event) => {
    if (holdR.keyUp(event)) return;
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") stopSideways(-1);
    if (key === "arrowright" || key === "d") stopSideways(1);
    if (key === "arrowdown" || key === "s") run.current.down = false;
  };

  const buttons = [
    {
      label: "◀",
      name: "Move left",
      press: () => startSideways(-1),
      release: () => stopSideways(-1),
    },
    {
      label: "▶",
      name: "Move right",
      press: () => startSideways(1),
      release: () => stopSideways(1),
    },
    { label: "⟳", name: "Turn", press: () => act((game) => rotate(game, 1)) },
    {
      label: "▼",
      name: "Soft drop",
      press: () => {
        run.current.down = true;
      },
      release: () => {
        run.current.down = false;
      },
    },
    { label: "⤓", name: "Drop", press: () => act((game) => hardDrop(game, Math.random)) },
    { label: "Hold", name: "Hold", press: () => act((game) => hold(game, Math.random)) },
    { label: "❚❚", name: "Pause", press: pause },
  ];

  return (
    <>
      <ArcadeCanvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Block Drop. Arrow keys move, up turns, space drops, C holds, P pauses, holding R starts again."
        $ratio={VIEW.width / VIEW.height}
        $most={364}
        $room={touch ? 340 : 440}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => {
          run.current.down = false;
          run.current.sideways = null;
          holdR.cancel();
        }}
      />
      {holdR.progress > 0 && <RestartBar progress={holdR.progress} />}
      {holdR.progress === 0 &&
        phase === "playing" &&
        (touch ? (
          <TouchPad buttons={buttons} />
        ) : (
          <KeyHint>
            ← → move · ↑ or X turns (Z the other way) · ↓ soft drop · Space drops · C holds · P
            pauses · Hold R to start again
          </KeyHint>
        ))}
      {phase === "paused" && <EndBar note="Paused." label="Carry on" onPress={resume} />}
      {phase === "over" && (
        <EndBar
          note={`${newBest ? "A new best! " : ""}You cleared ${run.current.game.lines} lines.`}
          onPress={restart}
        />
      )}
    </>
  );
};

export default BlockDrop;
