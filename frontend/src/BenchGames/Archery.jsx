import { useRef, useState } from "react";
import {
  ARROWS_EACH,
  DRIFT,
  RING,
  SWAY,
  TARGET,
  WORLD,
  archeryResult,
  drawStrength,
  pairOf,
  readArrow,
  shootArrow,
  shooter,
  swayScale,
  windFor,
} from "./archery.js";
import { clamp, sway, tenth } from "./skillShots.js";
import {
  CANVAS_FONT,
  GameCanvas,
  Hint,
  LastThrow,
  PLAYER_COLOURS,
  useCanvas,
  useFocusOnStart,
  useReducedMotion,
  useThrowGame,
} from "./skillCanvas.js";
import { AgainBar, Score, Status } from "./gameParts.jsx";

const { width: WIDTH, height: HEIGHT } = WORLD;
const KEY_STEP = 3;
const FINGER_LIFT = 56;
const FLIGHT_MS = 600;
const GROUND = 300;
// From the outside in: white, black, blue, red and gold, two rings each
const RING_COLOURS = ["#F4F4F0", "#26262E", "#3B7BD0", "#D23B3B", "#F2C631"];

function drawRange(context) {
  const sky = context.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, "#8EC3EC");
  sky.addColorStop(1, "#D9ECF7");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, GROUND);
  context.fillStyle = "#6FA457";
  context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);

  // The stand, then the boss and the face on it
  context.strokeStyle = "#7A5530";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(TARGET.x - 70, TARGET.y + 60);
  context.lineTo(TARGET.x - 110, GROUND + 30);
  context.moveTo(TARGET.x + 70, TARGET.y + 60);
  context.lineTo(TARGET.x + 110, GROUND + 30);
  context.stroke();
  context.fillStyle = "#C9B07A";
  context.beginPath();
  context.arc(TARGET.x, TARGET.y, TARGET.radius + 8, 0, Math.PI * 2);
  context.fill();
  for (let ring = 0; ring < 10; ring += 1) {
    context.fillStyle = RING_COLOURS[Math.floor(ring / 2)];
    context.beginPath();
    context.arc(TARGET.x, TARGET.y, TARGET.radius - ring * RING, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = ring === 2 || ring === 3 ? "#F4F4F0" : "#26262E";
    context.lineWidth = 0.6;
    context.stroke();
  }
  context.strokeStyle = "#26262E";
  context.beginPath();
  context.moveTo(TARGET.x - 3, TARGET.y);
  context.lineTo(TARGET.x + 3, TARGET.y);
  context.moveTo(TARGET.x, TARGET.y - 3);
  context.lineTo(TARGET.x, TARGET.y + 3);
  context.stroke();
}

// A flag on a pole and the number, so the push is plain before the arrow flies
function drawWind(context, wind) {
  const poleX = 34;
  context.strokeStyle = "#3A3A44";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(poleX, GROUND + 20);
  context.lineTo(poleX, 40);
  context.stroke();
  const length = 8 + Math.abs(wind) * 9;
  const side = wind < 0 ? -1 : 1;
  context.fillStyle = "#E8562F";
  context.beginPath();
  context.moveTo(poleX, 42);
  context.lineTo(poleX + side * length, 42 + (5 - Math.abs(wind)) * 3 + 6);
  context.lineTo(poleX, 62);
  context.closePath();
  context.fill();
  context.fillStyle = "#14235A";
  context.font = `600 16px ${CANVAS_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "top";
  const arrow = wind === 0 ? "calm" : `${Math.abs(wind)} ${wind < 0 ? "←" : "→"}`;
  context.fillText(`Wind ${arrow}`, 60, 14);
}

function drawArrow(context, at, player, size = 1) {
  context.save();
  context.translate(at.x, at.y);
  context.scale(size, size);
  context.strokeStyle = "#3A2A18";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-7, 9);
  context.stroke();
  context.strokeStyle = PLAYER_COLOURS[player];
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-6, 6);
  context.lineTo(-12, 8);
  context.moveTo(-6, 6);
  context.lineTo(-8, 13);
  context.stroke();
  context.fillStyle = "#1A1A20";
  context.beginPath();
  context.arc(0, 0, 1.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

const Archery = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const reduced = useReducedMotion();
  const turns = useThrowGame({
    host,
    match,
    sendMove,
    listenMoves,
    seeded: true,
    rules: {
      readThrow: readArrow,
      throwerOf: (n) => shooter(n, match),
      isOver: (throws) => archeryResult(throws).over,
    },
  });
  const { me, seed, ready, shown, next, myTurn, throwNow, flightAt } = turns;
  const aim = useRef({ x: TARGET.x, y: TARGET.y });
  const hold = useRef(null);
  const swayFrom = useRef(Math.random() * 100);
  const [failed, setFailed] = useState(false);

  const heldFor = (now) => (hold.current ? (now - hold.current.from) / 1000 : 0);
  const swayAt = (now) =>
    sway(swayFrom.current + now / (reduced ? 2000 : 1000), SWAY * swayScale(heldFor(now)));

  const draw = (context, now) => {
    drawRange(context);
    if (seed === null) return false;
    const flight = flightAt(now, () => (reduced ? 0 : FLIGHT_MS));
    const upNext = flight ? flight.entry.n : Math.min(next, shown.length);
    const wind = windFor(seed, pairOf(Math.max(0, upNext - (turns.over ? 1 : 0))));
    drawWind(context, wind);
    for (const arrow of shown) drawArrow(context, arrow, arrow.player);
    if (flight) {
      const { entry, progress } = flight;
      const push = windFor(seed, pairOf(entry.n)) * DRIFT;
      // Straight at where it was aimed less the wind, with the wind's push growing on the way
      const fromX = entry.x - push;
      const at = {
        x: fromX + (WIDTH / 2 - fromX) * (1 - progress) + push * progress * progress,
        y: entry.y + (HEIGHT + 40 - entry.y) * (1 - progress) - Math.sin(progress * Math.PI) * 50,
      };
      drawArrow(context, at, entry.player, 1 + (1 - progress) * 3);
    }
    if (myTurn) {
      const wobble = swayAt(now);
      const x = aim.current.x + wobble.x;
      const y = aim.current.y + wobble.y;
      context.strokeStyle = "#14235A";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y, 9, 0, Math.PI * 2);
      context.moveTo(x - 15, y);
      context.lineTo(x - 4, y);
      context.moveTo(x + 4, y);
      context.lineTo(x + 15, y);
      context.moveTo(x, y - 15);
      context.lineTo(x, y - 4);
      context.moveTo(x, y + 4);
      context.lineTo(x, y + 15);
      context.stroke();
      if (hold.current) {
        const strength = drawStrength(heldFor(now));
        context.fillStyle = "rgba(10, 12, 24, 0.55)";
        context.fillRect(WIDTH / 2 - 60, HEIGHT - 26, 120, 12);
        context.fillStyle = strength >= 1 ? "#7BE0A0" : "#F2C14E";
        context.fillRect(WIDTH / 2 - 58, HEIGHT - 24, 116 * strength, 8);
      }
    }
    return Boolean(flight) || myTurn;
  };

  const { canvasRef, toWorld, unitsPerPixel } = useCanvas(WIDTH, HEIGHT, draw);
  useFocusOnStart(canvasRef);

  const aimAt = (point) => {
    aim.current = { x: clamp(point.x, 0, WIDTH), y: clamp(point.y, 0, HEIGHT) };
  };

  const aimFromPointer = (event) => {
    const point = toWorld(event);
    if (event.pointerType !== "mouse") point.y -= FINGER_LIFT * unitsPerPixel();
    aimAt(point);
  };

  const release = () => {
    const held = hold.current;
    if (!held) return;
    const now = performance.now();
    const wobble = swayAt(now);
    const strength = drawStrength(heldFor(now));
    hold.current = null;
    if (!myTurn) return;
    const wind = windFor(seed, pairOf(next));
    const arrow = shootArrow({ aim: aim.current, wobble, draw: strength, wind });
    setFailed(
      !throwNow({
        ax: tenth(aim.current.x),
        ay: tenth(aim.current.y),
        dr: Math.round(strength * 1000) / 1000,
        ...arrow,
      })
    );
  };

  const onPointerDown = (event) => {
    if (!myTurn || hold.current) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    aimFromPointer(event);
    hold.current = { from: performance.now(), pointer: event.pointerId };
  };

  const onPointerMove = (event) => {
    if (!myTurn) return;
    if (event.pointerType === "mouse" || hold.current?.pointer === event.pointerId) {
      aimFromPointer(event);
    }
  };

  const onPointerUp = (event) => {
    if (hold.current?.pointer === event.pointerId) release();
  };

  const onPointerCancel = (event) => {
    if (hold.current?.pointer === event.pointerId) hold.current = null;
  };

  const onKeyDown = (event) => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[event.key]) {
      event.preventDefault();
      const [dx, dy] = moves[event.key];
      aimAt({ x: aim.current.x + dx * KEY_STEP, y: aim.current.y + dy * KEY_STEP });
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (event.repeat || !myTurn || hold.current) return;
      hold.current = { from: performance.now(), pointer: "key" };
    }
  };

  const onKeyUp = (event) => {
    if ((event.key === " " || event.key === "Enter") && hold.current?.pointer === "key") {
      event.preventDefault();
      release();
    }
  };

  const result = archeryResult(shown);
  const over = turns.over;
  const mine = result.totals[me];
  const theirs = result.totals[1 - me];
  const settled = shown.length === next;
  const arrowNumber = Math.min(pairOf(shown.length), ARROWS_EACH - 1) + 1;

  let status;
  if (over) {
    if (result.winner === null) status = "It's a draw.";
    else status = result.winner === me ? "You win!" : `${partnerName} wins.`;
  } else if (!ready) status = "Setting up the target…";
  else if (!settled) {
    status = shooter(shown.length, match) === me ? "Loosed…" : `${partnerName} shoots…`;
  } else if (myTurn) status = "Your arrow.";
  else status = `${partnerName} is taking aim…`;

  const last = shown[shown.length - 1];
  const lastLine = failed
    ? "That one didn't send. Try again."
    : last
      ? `${last.player === me ? "You" : partnerName}: ${last.pts ? last.pts : "missed"}`
      : "";

  return (
    <>
      <Score>
        You {mine} – {theirs} {partnerName} · arrow {arrowNumber} of {ARROWS_EACH}
      </Score>
      <Status aria-live="polite">{status}</Status>
      <GameCanvas
        ref={canvasRef}
        $ratio={`${WIDTH} / ${HEIGHT}`}
        $active={myTurn}
        tabIndex={0}
        role="application"
        aria-label="Archery target"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      />
      <LastThrow aria-live="polite">{lastLine}</LastThrow>
      {over ? (
        <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />
      ) : (
        <Hint>
          Aim with the pointer or arrow keys, then hold down (or hold Space) to draw the bow and let
          go. Holding steadies the aim for a few seconds, then the arm tires. Aim into the wind.
        </Hint>
      )}
    </>
  );
};

export default Archery;
