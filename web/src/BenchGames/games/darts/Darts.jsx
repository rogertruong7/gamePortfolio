import { useRef, useState } from "react";
import {
  DARTS,
  METER_SECONDS,
  REGULATION,
  RINGS,
  ROUNDS,
  SECTORS,
  SWAY_MM,
  SWEET,
  SWEET_BAND,
  dartThrower,
  dartsResult,
  hitName,
  readDart,
  roundOf,
  throwDart,
  visitOf,
} from "./darts.js";
import { clamp, pingPong, sway, tenth } from "../../shared/skillShots.js";
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
} from "../../shared/skillCanvas.js";
import { AgainBar, Score, Status } from "../../shared/gameParts.jsx";

const WIDTH = 440;
const HEIGHT = 400;
const CENTRE = { x: 200, y: 200 };
// The outside of the doubles ring is this many units from the middle
const SCALE = 150 / RINGS.doubleOut;
const AIM_REACH = 220;
const KEY_STEP = 3;
// A finger covers what it's on, so on a touch screen the aim sits this many CSS pixels above it
const FINGER_LIFT = 56;
const FLIGHT_MS = 420;

const toBoard = (point) => ({ x: (point.x - CENTRE.x) / SCALE, y: (point.y - CENTRE.y) / SCALE });
const toWorld = (x, y) => ({ x: CENTRE.x + x * SCALE, y: CENTRE.y + y * SCALE });

const DARK = "#24242E";
const LIGHT = "#F1E6C8";
const RED = "#B8323F";
const GREEN = "#2F8A5B";

function drawBoard(context) {
  context.fillStyle = "#33425F";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#15151C";
  context.beginPath();
  context.arc(CENTRE.x, CENTRE.y, 192, 0, Math.PI * 2);
  context.fill();

  const slice = (Math.PI * 2) / SECTORS.length;
  const bands = [
    [RINGS.outer, RINGS.trebleIn, false],
    [RINGS.trebleIn, RINGS.trebleOut, true],
    [RINGS.trebleOut, RINGS.doubleIn, false],
    [RINGS.doubleIn, RINGS.doubleOut, true],
  ];
  SECTORS.forEach((number, i) => {
    // 20 is straight up, and canvas angles start from the right
    const from = -Math.PI / 2 + (i - 0.5) * slice;
    for (const [inner, outer, ring] of bands) {
      context.fillStyle = ring ? (i % 2 ? GREEN : RED) : i % 2 ? LIGHT : DARK;
      context.beginPath();
      context.arc(CENTRE.x, CENTRE.y, outer * SCALE, from, from + slice);
      context.arc(CENTRE.x, CENTRE.y, inner * SCALE, from + slice, from, true);
      context.closePath();
      context.fill();
    }
    const middle = from + slice / 2;
    context.fillStyle = "#F4F1E8";
    context.font = `600 15px ${CANVAS_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      String(number),
      CENTRE.x + Math.cos(middle) * 171,
      CENTRE.y + Math.sin(middle) * 171
    );
  });

  context.fillStyle = GREEN;
  context.beginPath();
  context.arc(CENTRE.x, CENTRE.y, RINGS.outer * SCALE, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = RED;
  context.beginPath();
  context.arc(CENTRE.x, CENTRE.y, RINGS.bull * SCALE, 0, Math.PI * 2);
  context.fill();

  // Thin wires between the beds
  context.strokeStyle = "rgba(210, 210, 220, 0.45)";
  context.lineWidth = 0.6;
  for (const radius of [RINGS.outer, RINGS.trebleIn, RINGS.trebleOut, RINGS.doubleIn]) {
    context.beginPath();
    context.arc(CENTRE.x, CENTRE.y, radius * SCALE, 0, Math.PI * 2);
    context.stroke();
  }
}

// A dart stuck in the board, or on its way there at a bigger size
function drawDart(context, at, player, size = 1) {
  context.save();
  context.translate(at.x, at.y);
  context.scale(size, size);
  context.strokeStyle = "#D9D9E0";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(12, -16);
  context.stroke();
  context.fillStyle = PLAYER_COLOURS[player];
  context.strokeStyle = "#101018";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(10, -13);
  context.lineTo(22, -18);
  context.lineTo(15, -27);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#101018";
  context.beginPath();
  context.arc(0, 0, 1.8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawMeter(context, power) {
  const left = 404;
  const top = 110;
  const tall = 180;
  context.fillStyle = "rgba(10, 12, 24, 0.7)";
  context.fillRect(left, top, 18, tall);
  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  context.fillRect(left, top + tall * (1 - SWEET - SWEET_BAND), 18, tall * SWEET_BAND * 2);
  context.fillStyle = Math.abs(power - SWEET) <= SWEET_BAND ? "#7BE0A0" : "#F2C14E";
  context.fillRect(left + 3, top + tall * (1 - power), 12, tall * power);
}

const Darts = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const reduced = useReducedMotion();
  const turns = useThrowGame({
    host,
    match,
    sendMove,
    listenMoves,
    seeded: false,
    rules: {
      readThrow: readDart,
      throwerOf: (n) => dartThrower(n, match),
      isOver: (throws) => dartsResult(throws).over,
    },
  });
  const { me, shown, next, myTurn, throwNow, flightAt } = turns;
  const aim = useRef({ x: 0, y: 0 });
  const hold = useRef(null);
  // Each screen's hand wanders from its own starting point
  const swayFrom = useRef(Math.random() * 100);
  const [failed, setFailed] = useState(false);

  const swayAt = (now) => sway(swayFrom.current + now / (reduced ? 2000 : 1000), SWAY_MM);
  const powerAt = (now) =>
    hold.current ? pingPong((now - hold.current.from) / 1000, METER_SECONDS) : 0;

  const draw = (context, now) => {
    drawBoard(context);
    const flight = flightAt(now, () => (reduced ? 0 : FLIGHT_MS));
    const focus = flight ? flight.entry.n : shown.length - 1;
    if (focus >= 0) {
      for (const dart of shown) {
        if (visitOf(dart.n) !== visitOf(focus)) continue;
        drawDart(context, toWorld(dart.x, dart.y), dart.player);
      }
    }
    if (flight) {
      const { entry, progress } = flight;
      const end = toWorld(entry.x, entry.y);
      const at = { x: end.x, y: end.y + (1 - progress) * 220 - Math.sin(progress * Math.PI) * 60 };
      drawDart(context, at, entry.player, 1 + (1 - progress) * 1.6);
    }
    if (myTurn) {
      const wobble = swayAt(now);
      const at = toWorld(aim.current.x + wobble.x, aim.current.y + wobble.y);
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(at.x, at.y, 7, 0, Math.PI * 2);
      context.moveTo(at.x - 12, at.y);
      context.lineTo(at.x + 12, at.y);
      context.moveTo(at.x, at.y - 12);
      context.lineTo(at.x, at.y + 12);
      context.stroke();
      if (hold.current) drawMeter(context, powerAt(now));
    }
    return Boolean(flight) || myTurn;
  };

  const { canvasRef, toWorld: pointerAt, unitsPerPixel } = useCanvas(WIDTH, HEIGHT, draw);
  useFocusOnStart(canvasRef);

  const aimAt = (point) => {
    aim.current = {
      x: clamp(point.x, -AIM_REACH, AIM_REACH),
      y: clamp(point.y, -AIM_REACH, AIM_REACH),
    };
  };

  const aimFromPointer = (event) => {
    const point = pointerAt(event);
    if (event.pointerType !== "mouse") point.y -= FINGER_LIFT * unitsPerPixel();
    aimAt(toBoard(point));
  };

  const release = () => {
    const held = hold.current;
    hold.current = null;
    if (!held || !myTurn) return;
    const now = performance.now();
    const power = pingPong((now - held.from) / 1000, METER_SECONDS);
    const dart = throwDart({ aim: aim.current, wobble: swayAt(now), power });
    setFailed(
      !throwNow({
        ax: tenth(aim.current.x),
        ay: tenth(aim.current.y),
        pw: Math.round(power * 1000) / 1000,
        ...dart,
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

  const result = dartsResult(shown);
  const over = turns.over;
  const mine = result.totals[me];
  const theirs = result.totals[1 - me];
  const settled = shown.length === next;
  const upNext = settled ? next : shown.length;
  const sudden = upNext >= REGULATION;
  const round = Math.min(roundOf(upNext), ROUNDS - 1) + 1;

  let status;
  if (over) status = result.winner === me ? "You win!" : `${partnerName} wins.`;
  else if (!settled) {
    status = dartThrower(upNext, match) === me ? "There it goes…" : `${partnerName} throws…`;
  } else if (myTurn) {
    const dart = (next % DARTS) + 1;
    status = sudden ? "Sudden death. Your dart." : `Your throw. Dart ${dart} of ${DARTS}.`;
  } else status = sudden ? `Sudden death. ${partnerName}'s dart.` : `${partnerName} is throwing…`;

  const last = shown[shown.length - 1];
  const lastScore = last?.pts ? ` · ${last.pts}` : "";
  const lastLine = failed
    ? "That one didn't send. Try again."
    : last
      ? `${last.player === me ? "You" : partnerName}: ${hitName(last.hit)}${lastScore}`
      : "";

  return (
    <>
      <Score>
        You {mine} – {theirs} {partnerName} ·{" "}
        {result.sudden && !over ? "sudden death" : `round ${round} of ${ROUNDS}`}
      </Score>
      <Status aria-live="polite">{status}</Status>
      <GameCanvas
        ref={canvasRef}
        $ratio={`${WIDTH} / ${HEIGHT}`}
        $active={myTurn}
        tabIndex={0}
        role="application"
        aria-label="Dartboard"
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
          Aim with the pointer or arrow keys. Hold down (or hold Space) and let go while the meter
          is in the light band. The aim wanders, so time it.
        </Hint>
      )}
    </>
  );
};

export default Darts;
