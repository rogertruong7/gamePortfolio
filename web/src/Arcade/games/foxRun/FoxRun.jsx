import { useCallback, useRef, useState } from "react";
import {
  FOX,
  FOX_X,
  GROUND,
  STEP_SECONDS,
  WORLD,
  foxBox,
  newGame,
  onGround,
  scoreOf,
  step,
} from "./foxRun.js";
import {
  useCanvas,
  useFocusOnStart,
  useReducedMotion,
} from "../../../BenchGames/shared/skillCanvas.js";
import { ink, inkSoft, pixel } from "../../../UserInterface/Modal.jsx";
import { readBest, saveBest } from "../../best.js";
import { ArcadeCanvas, EndBar, KeyHint, TouchPad } from "../../arcadeParts.jsx";
import { usePauseWhenHidden, useTouchScreen } from "../../arcadeHooks.js";

const { width: WIDTH, height: HEIGHT } = WORLD;
const BEST_KEY = "foxrun";
// A jump pressed this soon after bumping into something doesn't start another run, so mashing
// the key doesn't skip past the end
const RESTART_AFTER_MS = 500;
// A slow frame catches up at most this many steps, rather than jumping ahead all at once
const MOST_STEPS = 12;
const FUR = "#E07A2E";
const FUR_DARK = "#A8501C";
const STONE = "#9AA3B5";
const STONE_DARK = "#6B7489";

const padded = (n) => String(n).padStart(5, "0");

// Hills far off move slowly and blossom trees nearer move quicker, so the town has some depth
function drawBackdrop(context, distance) {
  const sky = context.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#BFE3F4");
  sky.addColorStop(1, "#EAF6FB");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, GROUND);

  context.fillStyle = "#C9D9EA";
  const hillShift = (distance * 0.15) % 240;
  for (let x = -hillShift - 120; x < WIDTH + 240; x += 240) {
    context.beginPath();
    context.ellipse(x + 120, GROUND + 10, 150, 64, 0, Math.PI, 0);
    context.fill();
  }

  const treeShift = (distance * 0.45) % 180;
  for (let x = -treeShift; x < WIDTH + 180; x += 180) {
    context.fillStyle = "#8A6A55";
    context.fillRect(x + 60, GROUND - 46, 6, 46);
    context.fillStyle = "#F4C6D6";
    context.beginPath();
    context.arc(x + 63, GROUND - 56, 22, 0, Math.PI * 2);
    context.arc(x + 48, GROUND - 46, 15, 0, Math.PI * 2);
    context.arc(x + 79, GROUND - 46, 16, 0, Math.PI * 2);
    context.fill();
  }

  // The path, with flecks that go by at the fox's speed
  context.fillStyle = "#D8C3A0";
  context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
  context.fillStyle = "#B79E78";
  context.fillRect(0, GROUND, WIDTH, 2);
  const fleckShift = distance % 60;
  for (let x = -fleckShift; x < WIDTH + 60; x += 60) {
    context.fillRect(x + 8, GROUND + 9, 10, 2);
    context.fillRect(x + 38, GROUND + 19, 6, 2);
  }
}

function drawFox(context, game, still) {
  const box = foxBox(game);
  const ducking = box.top - box.bottom === FOX.duck.height;
  const feet = GROUND - game.y;
  const x = FOX_X;
  // Two frames of running, swapped by how far it's gone
  const stride = onGround(game) && !still ? Math.floor(game.distance / 22) % 2 : 0;
  context.fillStyle = FUR;
  if (ducking) {
    context.fillRect(x, feet - 16, 34, 12);
    context.fillRect(x + 30, feet - 18, 14, 12);
    context.fillStyle = FUR_DARK;
    context.fillRect(x + 42, feet - 14, 4, 4);
    context.fillStyle = FUR;
    context.fillRect(x + 32, feet - 22, 4, 4);
    context.fillRect(x - 10, feet - 16, 12, 6);
    context.fillStyle = "#FFFFFF";
    context.fillRect(x - 14, feet - 16, 5, 5);
    context.fillStyle = FUR_DARK;
    context.fillRect(x + 4 + stride * 6, feet - 4, 4, 4);
    context.fillRect(x + 22 - stride * 6, feet - 4, 4, 4);
  } else {
    // Body, head and ears
    context.fillRect(x + 2, feet - 24, 24, 14);
    context.fillRect(x + 20, feet - 34, 14, 14);
    context.fillRect(x + 21, feet - 38, 4, 4);
    context.fillRect(x + 29, feet - 38, 4, 4);
    context.fillStyle = "#FFFFFF";
    context.fillRect(x + 26, feet - 24, 8, 4);
    context.fillStyle = ink;
    context.fillRect(x + 28, feet - 30, 3, 3);
    context.fillStyle = FUR_DARK;
    context.fillRect(x + 33, feet - 26, 3, 3);
    // Tail, with a white tip
    context.fillStyle = FUR;
    context.fillRect(x - 10, feet - 26, 14, 8);
    context.fillStyle = "#FFFFFF";
    context.fillRect(x - 14, feet - 28, 6, 6);
    // Legs
    context.fillStyle = FUR_DARK;
    if (onGround(game)) {
      context.fillRect(x + 4, feet - 10, 4, stride ? 10 : 6);
      context.fillRect(x + 20, feet - 10, 4, stride ? 6 : 10);
    } else {
      context.fillRect(x + 2, feet - 10, 6, 4);
      context.fillRect(x + 22, feet - 10, 6, 4);
    }
  }
  if (game.over) {
    context.fillStyle = ink;
    context.font = `600 16px ${pixel}`;
    context.textAlign = "center";
    context.fillText("!", x + 28, feet - 44 + (ducking ? 22 : 0));
  }
}

function drawLantern(context, o) {
  const x = o.x;
  const top = GROUND - o.height;
  context.fillStyle = STONE_DARK;
  context.fillRect(x, GROUND - 6, o.width, 6);
  context.fillStyle = STONE;
  context.fillRect(x + 7, top + 22, o.width - 14, o.height - 28);
  context.fillRect(x + 2, top + 10, o.width - 4, 12);
  context.fillStyle = "#F2C14E";
  context.fillRect(x + 7, top + 13, o.width - 14, 6);
  context.fillStyle = STONE_DARK;
  context.fillRect(x - 2, top + 4, o.width + 4, 6);
  context.fillRect(x + o.width / 2 - 3, top, 6, 4);
}

function drawRocks(context, o) {
  for (let i = 0; i < o.count; i += 1) {
    const x = o.x + 2 + i * 20;
    const height = o.height - (i % 2) * 6;
    context.fillStyle = STONE;
    context.beginPath();
    context.roundRect(x, GROUND - height, 20, height, [8, 8, 2, 2]);
    context.fill();
    context.fillStyle = STONE_DARK;
    context.fillRect(x + 4, GROUND - height + 6, 4, 4);
  }
}

function drawCrow(context, o, now, still) {
  const x = o.x;
  const bottom = GROUND - o.bottom;
  const up = !still && Math.floor(now / 140) % 2 === 0;
  context.fillStyle = "#2B2F45";
  context.fillRect(x + 6, bottom - 14, 26, 10);
  context.fillRect(x, bottom - 16, 10, 8);
  context.fillStyle = "#F2C14E";
  context.fillRect(x - 5, bottom - 13, 5, 3);
  context.fillStyle = "#2B2F45";
  if (up) context.fillRect(x + 12, bottom - 22, 14, 8);
  else context.fillRect(x + 12, bottom - 4, 14, 8);
}

function drawScore(context, game, best) {
  context.fillStyle = inkSoft;
  context.font = `600 16px ${pixel}`;
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(
    `Best ${padded(Math.max(best, scoreOf(game)))}   ${padded(scoreOf(game))}`,
    WIDTH - 12,
    10
  );
}

function drawMessage(context, text) {
  context.fillStyle = ink;
  context.font = `600 22px ${pixel}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, WIDTH / 2, 64);
}

const FoxRun = () => {
  // ready (waiting for the first jump), playing, paused or over
  const [phase, setPhase] = useState("ready");
  const [best, setBest] = useState(() => readBest(BEST_KEY));
  const [newBest, setNewBest] = useState(false);
  const still = useReducedMotion();
  const touch = useTouchScreen();
  const run = useRef(null);
  if (!run.current) {
    run.current = { game: newGame(Math.random), last: null, spare: 0, jump: false, duck: false };
  }

  const draw = (context, now) => {
    const r = run.current;
    if (phase === "playing") {
      const seconds = r.last === null ? 0 : Math.min(0.1, (now - r.last) / 1000);
      r.last = now;
      r.spare += seconds;
      let steps = 0;
      while (r.spare >= STEP_SECONDS && steps < MOST_STEPS && !r.game.over) {
        r.game = step(r.game, { jump: r.jump, duck: r.duck }, Math.random);
        r.spare -= STEP_SECONDS;
        steps += 1;
      }
      if (steps >= MOST_STEPS) r.spare = 0;
      if (r.game.over) {
        r.overAt = now;
        setNewBest(saveBest(BEST_KEY, scoreOf(r.game)));
        setBest(readBest(BEST_KEY));
        setPhase("over");
      }
    }
    const { game } = r;
    drawBackdrop(context, game.distance);
    for (const o of game.obstacles) {
      if (o.kind === "lantern") drawLantern(context, o);
      if (o.kind === "rocks") drawRocks(context, o);
      if (o.kind === "crow") drawCrow(context, o, now, still);
    }
    drawFox(context, game, still);
    drawScore(context, game, best);
    if (phase === "ready")
      drawMessage(context, touch ? "Tap Jump to start" : "Press space to start");
    if (phase === "paused") drawMessage(context, "Paused");
    if (phase === "over") drawMessage(context, newBest ? "A new best!" : "Bonk!");
    return phase === "playing";
  };
  const { canvasRef } = useCanvas(WIDTH, HEIGHT, draw);
  useFocusOnStart(canvasRef);

  const pause = useCallback(() => {
    setPhase((current) => (current === "playing" ? "paused" : current));
  }, []);
  usePauseWhenHidden(pause);

  const begin = () => {
    run.current.last = null;
    run.current.spare = 0;
    setPhase("playing");
    canvasRef.current?.focus();
  };

  const restart = () => {
    run.current = { game: newGame(Math.random), last: null, spare: 0, jump: false, duck: false };
    setNewBest(false);
    begin();
  };

  const pressJump = () => {
    if (phase === "ready" || phase === "paused") begin();
    if (phase === "over") {
      if (performance.now() - (run.current.overAt ?? 0) >= RESTART_AFTER_MS) restart();
      return;
    }
    run.current.jump = true;
  };
  const releaseJump = () => {
    run.current.jump = false;
  };

  const onKeyDown = (event) => {
    const key = event.key.toLowerCase();
    if (key === "p") {
      event.preventDefault();
      if (phase === "playing") pause();
      else if (phase === "paused") begin();
      return;
    }
    if (key === " " || key === "arrowup" || key === "w") {
      event.preventDefault();
      if (!event.repeat) pressJump();
    }
    if (key === "arrowdown" || key === "s") {
      event.preventDefault();
      run.current.duck = true;
    }
  };

  const onKeyUp = (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "arrowup" || key === "w") releaseJump();
    if (key === "arrowdown" || key === "s") run.current.duck = false;
  };

  const buttons = [
    { label: "Jump", name: "Jump", press: pressJump, release: releaseJump },
    {
      label: "Duck",
      name: "Duck",
      press: () => {
        run.current.duck = true;
      },
      release: () => {
        run.current.duck = false;
      },
    },
  ];

  return (
    <>
      <ArcadeCanvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Fox Run. Space or up jumps, down ducks, P pauses."
        $ratio={WIDTH / HEIGHT}
        $most={720}
        $room={340}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.focus();
          pressJump();
        }}
        onPointerUp={releaseJump}
        onPointerCancel={releaseJump}
        onBlur={() => {
          run.current.jump = false;
          run.current.duck = false;
        }}
      />
      {phase !== "over" &&
        (touch ? (
          <TouchPad buttons={buttons} />
        ) : (
          <KeyHint>Space or ↑ jumps (hold it to go higher) · ↓ ducks · P pauses</KeyHint>
        ))}
      {phase === "paused" && <EndBar label="Carry on" onPress={begin} />}
      {phase === "over" && (
        <EndBar
          note={`${newBest ? "A new best! " : ""}You ran ${scoreOf(run.current.game)}.`}
          onPress={restart}
        />
      )}
    </>
  );
};

export default FoxRun;
