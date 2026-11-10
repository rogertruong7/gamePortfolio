import { useRef, useState } from "react";
import {
  BALL_RADIUS,
  FLOOR,
  FRAME_SECONDS,
  MAX_SPEED,
  MIN_SPEED,
  PULL_POWER,
  SHOTS_EACH,
  START,
  WORLD,
  aimed,
  hoopFor,
  hoopsResult,
  launch,
  pairOf,
  readShot,
  shooter,
  simulateShot,
} from "./hoops.js";
import { clamp, pingPong } from "./skillShots.js";
import {
  GameCanvas,
  Hint,
  LastThrow,
  useCanvas,
  useFocusOnStart,
  useReducedMotion,
  useThrowGame,
} from "./skillCanvas.js";
import { AgainBar, Score, Status } from "./gameParts.jsx";

const { width: WIDTH, height: HEIGHT } = WORLD;
// A pull shorter than this is a tap, not a shot
const SHORTEST_PULL = 10;
const METER_SECONDS = 1.1;
const KEY_ANGLES = { low: 15, high: 85, start: 55 };
const BALL = "#E07A2E";

function drawCourt(context) {
  context.fillStyle = "#DCE7F0";
  context.fillRect(0, 0, WIDTH, FLOOR);
  context.fillStyle = "#C98F55";
  context.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
  context.strokeStyle = "#A87240";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, FLOOR);
  context.lineTo(WIDTH, FLOOR);
  context.stroke();
}

function drawHoop(context, hoop) {
  const { front, back, board, y } = hoop;
  context.fillStyle = "#5B6478";
  context.fillRect(board.x + 4, board.bottom - 4, 6, FLOOR - board.bottom + 4);
  context.fillStyle = "#FFFFFF";
  context.strokeStyle = "#5B6478";
  context.lineWidth = 2;
  context.fillRect(board.x - 2, board.top, 6, board.bottom - board.top);
  context.strokeRect(board.x - 2, board.top, 6, board.bottom - board.top);

  // The net, drawn behind the front of the rim
  context.strokeStyle = "rgba(255, 255, 255, 0.95)";
  context.lineWidth = 1.2;
  const drop = 38;
  const inset = 11;
  context.beginPath();
  for (let i = 0; i <= 4; i += 1) {
    const top = front.x + ((back.x - front.x) * i) / 4;
    const bottom = front.x + inset + ((back.x - front.x - inset * 2) * (4 - i)) / 4;
    context.moveTo(top, y);
    context.lineTo(bottom, y + drop);
  }
  context.moveTo(front.x + inset, y + drop);
  context.lineTo(back.x - inset, y + drop);
  context.stroke();

  context.strokeStyle = "#D2452F";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(front.x, y);
  context.lineTo(board.x - 2, y);
  context.stroke();
}

function drawBall(context, x, y) {
  context.fillStyle = BALL;
  context.strokeStyle = "#5A2C10";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(x - BALL_RADIUS, y);
  context.lineTo(x + BALL_RADIUS, y);
  context.moveTo(x, y - BALL_RADIUS);
  context.lineTo(x, y + BALL_RADIUS);
  context.stroke();
}

// Which way and how hard, without showing where it'll go
function drawAim(context, vx, vy) {
  const speed = Math.hypot(vx, vy);
  if (!speed) return;
  const length = 30 + (speed / MAX_SPEED) * 80;
  const ux = vx / speed;
  const uy = vy / speed;
  const tipX = START.x + ux * length;
  const tipY = START.y + uy * length;
  context.strokeStyle = "#14235A";
  context.fillStyle = "#14235A";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(START.x + ux * BALL_RADIUS, START.y + uy * BALL_RADIUS);
  context.lineTo(tipX, tipY);
  context.stroke();
  context.beginPath();
  context.moveTo(tipX + ux * 8, tipY + uy * 8);
  context.lineTo(tipX - uy * 6, tipY + ux * 6);
  context.lineTo(tipX + uy * 6, tipY - ux * 6);
  context.closePath();
  context.fill();
}

const Hoops = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const reduced = useReducedMotion();
  const turns = useThrowGame({
    host,
    match,
    sendMove,
    listenMoves,
    seeded: true,
    rules: {
      readThrow: readShot,
      throwerOf: (n) => shooter(n, match),
      isOver: (throws) => hoopsResult(throws).over,
    },
  });
  const { me, seed, ready, shown, next, myTurn, throwNow, flightAt } = turns;
  const pull = useRef(null);
  const angle = useRef(KEY_ANGLES.start);
  const flights = useRef(new Map());
  const [failed, setFailed] = useState(false);

  // Both screens fly each shot once from its two numbers and keep the path for drawing
  const flightOf = (entry) => {
    let flown = flights.current.get(entry.n);
    if (!flown) {
      flown = simulateShot(hoopFor(seed, pairOf(entry.n)), entry.vx, entry.vy);
      flights.current.set(entry.n, flown);
    }
    return flown;
  };

  const keySpeed = (now) =>
    MIN_SPEED + pingPong((now - pull.current.from) / 1000, METER_SECONDS) * (MAX_SPEED - MIN_SPEED);

  const pulled = (now) => {
    const current = pull.current;
    if (!current) return null;
    if (current.pointer === "key") {
      const turn = (angle.current * Math.PI) / 180;
      const speed = keySpeed(now);
      return { vx: Math.cos(turn) * speed, vy: -Math.sin(turn) * speed };
    }
    const dx = current.to.x - current.start.x;
    const dy = current.to.y - current.start.y;
    const length = Math.hypot(dx, dy);
    if (length < SHORTEST_PULL) return null;
    const speed = clamp(length * PULL_POWER, MIN_SPEED, MAX_SPEED);
    return { vx: (-dx / length) * speed, vy: (-dy / length) * speed };
  };

  const draw = (context, now) => {
    drawCourt(context);
    if (seed === null) return false;
    const flight = flightAt(now, (entry) =>
      reduced ? 0 : (flightOf(entry).path.length / 2) * FRAME_SECONDS * 1000
    );
    const upNext = flight ? flight.entry.n : Math.min(next, shown.length);
    const lastPair = pairOf(Math.max(0, upNext - (turns.over ? 1 : 0)));
    drawHoop(context, hoopFor(seed, lastPair));
    if (flight) {
      const { path } = flightOf(flight.entry);
      const frames = path.length / 2;
      const at = Math.min(frames - 1, Math.floor(flight.progress * (frames - 1)));
      drawBall(context, path[at * 2], path[at * 2 + 1]);
      return true;
    }
    if (turns.over) return false;
    drawBall(context, START.x, START.y);
    if (!myTurn) return false;
    const aim = pulled(now);
    if (aim) drawAim(context, aim.vx, aim.vy);
    else if (!pull.current) {
      const turn = (angle.current * Math.PI) / 180;
      context.globalAlpha = 0.35;
      drawAim(context, Math.cos(turn) * MIN_SPEED, -Math.sin(turn) * MIN_SPEED);
      context.globalAlpha = 1;
    }
    return Boolean(pull.current);
  };

  const { canvasRef, toWorld, wake } = useCanvas(WIDTH, HEIGHT, draw);
  useFocusOnStart(canvasRef);

  const shoot = (velocity) => {
    const hoop = hoopFor(seed, pairOf(next));
    const { pts } = simulateShot(hoop, velocity.vx, velocity.vy);
    setFailed(!throwNow({ vx: velocity.vx, vy: velocity.vy, pts }));
  };

  const onPointerDown = (event) => {
    if (!myTurn || pull.current) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = toWorld(event);
    pull.current = { pointer: event.pointerId, start: point, to: point };
    wake();
  };

  const onPointerMove = (event) => {
    if (pull.current?.pointer !== event.pointerId) return;
    pull.current.to = toWorld(event);
  };

  const onPointerUp = (event) => {
    const current = pull.current;
    if (current?.pointer !== event.pointerId) return;
    pull.current = null;
    const dx = current.to.x - current.start.x;
    const dy = current.to.y - current.start.y;
    if (!myTurn || Math.hypot(dx, dy) < SHORTEST_PULL) {
      wake();
      return;
    }
    shoot(launch(dx, dy));
  };

  const onPointerCancel = (event) => {
    if (pull.current?.pointer === event.pointerId) pull.current = null;
    wake();
  };

  const onKeyDown = (event) => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[event.key];
    if (step) {
      event.preventDefault();
      angle.current = clamp(angle.current + step, KEY_ANGLES.low, KEY_ANGLES.high);
      wake();
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (event.repeat || !myTurn || pull.current) return;
      pull.current = { pointer: "key", from: performance.now() };
      wake();
    }
  };

  const onKeyUp = (event) => {
    if ((event.key !== " " && event.key !== "Enter") || pull.current?.pointer !== "key") return;
    event.preventDefault();
    const speed = keySpeed(performance.now());
    pull.current = null;
    if (myTurn) shoot(aimed((angle.current * Math.PI) / 180, speed));
  };

  const result = hoopsResult(shown);
  const over = turns.over;
  const mine = result.totals[me];
  const theirs = result.totals[1 - me];
  const settled = shown.length === next;
  const shot = Math.min(pairOf(shown.length), SHOTS_EACH - 1) + 1;

  let status;
  if (over) {
    if (result.winner === null) status = "It's a draw.";
    else status = result.winner === me ? "You win!" : `${partnerName} wins.`;
  } else if (!ready) status = "Getting the court ready…";
  else if (!settled) {
    status = shooter(shown.length, match) === me ? "Up it goes…" : `${partnerName} shoots…`;
  } else if (myTurn) status = "Your shot.";
  else status = `${partnerName} is lining up…`;

  const last = shown[shown.length - 1];
  const words = { 0: "missed", 2: "scored · 2", 3: "swish! · 3" };
  const lastLine = failed
    ? "That one didn't send. Try again."
    : last
      ? `${last.player === me ? "You" : partnerName} ${words[last.pts]}`
      : "";

  return (
    <>
      <Score>
        You {mine} – {theirs} {partnerName} · shot {shot} of {SHOTS_EACH}
      </Score>
      <Status aria-live="polite">{status}</Status>
      <GameCanvas
        ref={canvasRef}
        $ratio={`${WIDTH} / ${HEIGHT}`}
        $active={myTurn}
        tabIndex={0}
        role="application"
        aria-label="Basketball hoop"
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
          Drag back and let go to shoot, like a slingshot. Or tip the arrow with the arrow keys and
          hold Space for power. A clean swish scores 3, anything else in scores 2.
        </Hint>
      )}
    </>
  );
};

export default Hoops;
