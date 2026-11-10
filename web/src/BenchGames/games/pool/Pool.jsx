import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { body, focusBlue, inkSoft } from "../../../UserInterface/Modal.jsx";
import { AgainBar, Score, Status } from "../../shared/gameParts.jsx";
import {
  CUSHIONS,
  FRAME_RATE,
  HEAD_STRING,
  HEIGHT,
  POCKETS,
  RADIUS,
  WIDTH,
  aimAt,
  isOff,
  roundPos,
  simulate,
} from "./poolPhysics.js";
import {
  applyShot,
  ballsLeft,
  canPlaceCue,
  newGame,
  playerGroup,
  readShot,
  shotData,
  startPos,
} from "./poolRules.js";

// The wooden rail around the cloth, in table units
const RAIL = 9;
const VIEW_W = WIDTH + RAIL * 2;
const VIEW_H = HEIGHT + RAIL * 2;
// How far to pull back, in table units, for a full-power shot
const PULL = 55;
// Holding Space swings the power up and back down over twice this long
const CHARGE_MS = 1300;
// Anything softer is a slip of the finger rather than a shot
const MIN_POWER = 0.03;
const TURN_STEP = Math.PI / 90;
const FINE_STEP = Math.PI / 720;

// Ball 1 to 8, and 9 to 15 share 1 to 7's colours with a stripe
const COLOURS = [
  "#FFFFFF",
  "#F2C12E",
  "#2156C9",
  "#D7322C",
  "#6A3A9C",
  "#EE7A22",
  "#0E6B3A",
  "#8A2232",
  "#161616",
];

const prefersLessMotion = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

function drawBall(ctx, id, x, y) {
  const colour = COLOURS[id > 8 ? id - 8 : id];
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.arc(x + 0.5, y + 0.7, RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = id > 8 ? "#F7F3E8" : colour;
  ctx.fillRect(x - RADIUS, y - RADIUS, RADIUS * 2, RADIUS * 2);
  if (id > 8) {
    ctx.fillStyle = colour;
    ctx.fillRect(x - RADIUS, y - RADIUS * 0.58, RADIUS * 2, RADIUS * 1.16);
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.arc(x - RADIUS * 0.35, y - RADIUS * 0.4, RADIUS * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (id === 0) return;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(x, y, RADIUS * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.font = `700 ${RADIUS * (id > 9 ? 0.72 : 0.86)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(id), x, y + RADIUS * 0.04);
}

function drawTable(ctx, inHand) {
  ctx.fillStyle = "#5B3417";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(0, 0, VIEW_W, VIEW_H, 6);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.fillStyle = "#23784F";
  ctx.fillRect(RAIL - 2, RAIL - 2, WIDTH + 4, HEIGHT + 4);
  ctx.save();
  ctx.translate(RAIL, RAIL);
  if (inHand === "kitchen") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    ctx.fillRect(0, 0, HEAD_STRING, HEIGHT);
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(HEAD_STRING, 0);
  ctx.lineTo(HEAD_STRING, HEIGHT);
  ctx.stroke();
  ctx.fillStyle = "#0B0B0B";
  for (const pocket of POCKETS) {
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, pocket.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#17603D";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (const [ax, ay, bx, by] of CUSHIONS) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAim(ctx, pos, angle, power) {
  const [cx, cy] = pos;
  const aim = aimAt(pos, angle);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(aim.x, aim.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  if (aim.hit > 0) {
    // Which way the ball it touches will go: straight away from the ghost ball
    const bx = pos[aim.hit * 2];
    const by = pos[aim.hit * 2 + 1];
    const d = Math.hypot(bx - aim.x, by - aim.y) || 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + ((bx - aim.x) / d) * 16, by + ((by - aim.y) / d) * 16);
    ctx.stroke();
  }
  // The cue, pulled back further the harder the shot
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const near = RADIUS + 1 + power * 18;
  const far = near + 80;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#E3C08A";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - ux * near, cy - uy * near);
  ctx.lineTo(cx - ux * far, cy - uy * far);
  ctx.stroke();
  ctx.strokeStyle = "#3A6FB8";
  ctx.beginPath();
  ctx.moveTo(cx - ux * near, cy - uy * near);
  ctx.lineTo(cx - ux * (near + 1.5), cy - uy * (near + 1.5));
  ctx.stroke();
}

function drawPower(ctx, power) {
  const x = VIEW_W - RAIL + 2.5;
  const height = HEIGHT - 10;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(x, RAIL + 5, 4, height);
  ctx.fillStyle = power > 0.8 ? "#E8452C" : "#F2C12E";
  ctx.fillRect(x, RAIL + 5 + height * (1 - power), 4, height * power);
}

// W A S D nudge the white about while it's in hand
const MOVES = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };

const groupLine = (game, group) => {
  const count = ballsLeft(game, group);
  return `${group}, ${count ? `${count} left` : "on the black"}`;
};

// What happened on the last shot, when it's worth saying
function shotNote(game, me, partnerName) {
  const { last, winner } = game;
  if (!last) return "";
  const who = last.shooter === me ? "you" : partnerName;
  const fouls = {
    scratch: `Foul: ${who} potted the white.`,
    miss: `Foul: ${who} didn't hit a ball.`,
    wrong: `Foul: ${who} hit the wrong ball first.`,
  };
  if (last.foul) {
    const next = game.turn === me ? "you" : partnerName;
    return winner === null ? `${fouls[last.foul]} Ball in hand for ${next}.` : fouls[last.foul];
  }
  if (last.respotted) return "The black went down on the break, so it's back on its spot.";
  if (last.assigned) {
    const group = playerGroup(game, last.shooter);
    return last.shooter === me ? `You're on ${group}.` : `${partnerName} is on ${group}.`;
  }
  return "";
}

// One shooter at a time. Whoever shoots works the shot out on their own screen and sends how it
// was struck and where everything ended up, in one message. The other screen plays the same
// shot to watch it roll, then takes the sent positions, and both work out the rules from the
// same numbers.
const Pool = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  // The game as of the last shot in, which can be ahead of what's on screen while a shot rolls
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = newGame(match);
  // The game as on screen, which catches up once each shot has finished rolling
  const [shown, setShown] = useState(gameRef.current);
  const shownRef = useRef(shown);
  const [rolling, setRolling] = useState(false);
  const canvasRef = useRef(null);
  const playback = useRef({ queue: [], start: 0, raf: 0 });
  // angle and power of the shot being lined up, where the white has been put for ball in hand,
  // the pointer drag going on, and when Space started being held
  const aim = useRef({ angle: 0, power: 0, cue: null, drag: null, chargeFrom: 0 });
  const live = useRef({});

  const canShoot = () => {
    const game = shownRef.current;
    return game === gameRef.current && game.winner === null && game.turn === me;
  };

  const cueFor = (game) =>
    game.inHand && aim.current.cue ? aim.current.cue : { x: game.pos[0], y: game.pos[1] };

  const draw = (frame) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas.width) return;
    const game = shownRef.current;
    const mine = canShoot();
    const scale = canvas.width / VIEW_W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawTable(ctx, mine && !frame ? game.inHand : null);
    let pos = frame;
    if (!pos) {
      pos = [...game.pos];
      const cue = cueFor(game);
      pos[0] = cue.x;
      pos[1] = cue.y;
    }
    ctx.save();
    ctx.translate(RAIL, RAIL);
    const { angle, power, drag } = aim.current;
    if (mine && !frame && drag?.mode !== "place") drawAim(ctx, pos, angle, power);
    for (let id = 15; id >= 0; id -= 1) {
      if (!isOff(pos[id * 2])) drawBall(ctx, id, pos[id * 2], pos[id * 2 + 1]);
    }
    if (mine && !frame && game.inHand) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1.2, 1.2]);
      ctx.beginPath();
      ctx.arc(pos[0], pos[1], RADIUS + 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    if (mine && !frame) drawPower(ctx, power);
  };

  // Plays the queued shots one after another, then stops asking for frames
  const tick = (now) => {
    const run = playback.current;
    const head = run.queue[0];
    let frame = null;
    if (head) {
      if (!run.start) run.start = now;
      const index = Math.floor(((now - run.start) / 1000) * FRAME_RATE);
      if (!head.frames || index >= head.frames.length) {
        run.queue.shift();
        run.start = 0;
        aim.current.cue = null;
        shownRef.current = head.after;
        setShown(head.after);
        if (!run.queue.length) setRolling(false);
      } else {
        frame = head.frames[index];
      }
    }
    const { chargeFrom } = aim.current;
    if (chargeFrom && !run.queue.length) {
      const t = ((now - chargeFrom) / CHARGE_MS) % 2;
      aim.current.power = t < 1 ? t : 2 - t;
    }
    draw(frame);
    run.raf = run.queue.length || chargeFrom ? requestAnimationFrame(live.current.tick) : 0;
  };

  const animate = () => {
    const run = playback.current;
    if (!run.raf) run.raf = requestAnimationFrame(live.current.tick);
  };

  // Takes a shot from either player, mine with the frames already worked out
  const take = (data, frames) => {
    const before = gameRef.current;
    const shot = readShot(data, before);
    if (!shot) return;
    const after = applyShot(before, shot);
    gameRef.current = after;
    let shotFrames = null;
    if (!prefersLessMotion()) {
      shotFrames =
        frames ??
        simulate(startPos(before, shot.cue), shot.angle, shot.power, { frames: true }).frames;
    }
    playback.current.queue.push({ frames: shotFrames, after });
    setRolling(true);
    animate();
  };

  const shoot = (angle, power) => {
    if (!canShoot()) return;
    const game = gameRef.current;
    const cue = cueFor(game);
    if (game.inHand && !canPlaceCue(game, cue.x, cue.y)) return;
    const strength = Math.min(1, Math.max(MIN_POWER, power));
    const result = simulate(startPos(game, cue), angle, strength, { frames: !prefersLessMotion() });
    const data = shotData(game, cue, angle, strength, { ...result, pos: roundPos(result.pos) });
    aim.current.power = 0;
    sendMove("play", { data });
    take(data, result.frames.length ? result.frames : null);
  };

  live.current = { tick, draw, take };

  // The canvas fills its box, drawn at the screen's real pixel density
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round((width * VIEW_H) / VIEW_W);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      live.current.draw(null);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    canvas.focus();
    const run = playback.current;
    return () => {
      observer.disconnect();
      cancelAnimationFrame(run.raf);
      run.raf = 0;
    };
  }, []);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        if (message.kind !== "play" || gameRef.current.turn === me) return;
        live.current.take(message.data, null);
      }),
    [listenMoves, match, me]
  );

  useEffect(() => {
    if (!playback.current.raf) live.current.draw(null);
  }, [shown]);

  const toTable = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_W - RAIL,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_H - RAIL,
    };
  };

  // Puts the white as near the point as it can legally go, keeping it where it was if not
  const place = (point) => {
    const game = shownRef.current;
    const right = game.inHand === "kitchen" ? HEAD_STRING : WIDTH - RADIUS;
    const x = Math.round(Math.min(right, Math.max(RADIUS, point.x)) * 10) / 10;
    const y = Math.round(Math.min(HEIGHT - RADIUS, Math.max(RADIUS, point.y)) * 10) / 10;
    if (canPlaceCue(game, x, y)) aim.current.cue = { x, y };
  };

  const onPointerDown = (event) => {
    if (!canShoot() || aim.current.chargeFrom) return;
    event.preventDefault();
    canvasRef.current.focus();
    canvasRef.current.setPointerCapture?.(event.pointerId);
    const point = toTable(event);
    const game = shownRef.current;
    const cue = cueFor(game);
    const reach = Math.hypot(point.x - cue.x, point.y - cue.y);
    aim.current.drag =
      game.inHand && reach < RADIUS * 2.5
        ? { mode: "place", id: event.pointerId }
        : { mode: "aim", id: event.pointerId, start: point, reach, moved: false };
    draw(null);
  };

  const onPointerMove = (event) => {
    const drag = aim.current.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const point = toTable(event);
    if (drag.mode === "place") {
      place(point);
    } else {
      const cue = cueFor(shownRef.current);
      if (Math.hypot(point.x - drag.start.x, point.y - drag.start.y) > 1.5) drag.moved = true;
      const reach = Math.hypot(point.x - cue.x, point.y - cue.y);
      if (drag.moved && reach > 0.5) {
        // Pulled back like a slingshot: the shot goes from the pointer through the white
        aim.current.angle = Math.atan2(cue.y - point.y, cue.x - point.x);
        aim.current.power = Math.min(1, Math.max(0, (reach - drag.reach) / PULL));
      }
    }
    draw(null);
  };

  const onPointerUp = (event) => {
    const drag = aim.current.drag;
    if (!drag || drag.id !== event.pointerId) return;
    aim.current.drag = null;
    const { angle, power } = aim.current;
    if (drag.mode === "aim" && !drag.moved && shownRef.current.inHand) {
      place(toTable(event));
    } else if (drag.mode === "aim" && drag.moved && power >= MIN_POWER) {
      shoot(angle, power);
      return;
    }
    aim.current.power = 0;
    draw(null);
  };

  const onPointerCancel = () => {
    aim.current.drag = null;
    aim.current.power = 0;
    draw(null);
  };

  const onKeyDown = (event) => {
    const key = event.key;
    // Space and the arrows would scroll the box otherwise, even while it's not this player's go
    if (key === " " || key.startsWith("Arrow")) event.preventDefault();
    if (!canShoot()) return;
    const fine = event.shiftKey;
    if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      const step = key === "ArrowLeft" || key === "ArrowRight" ? TURN_STEP : FINE_STEP;
      const sign = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
      // Kept between -pi and pi, as a shot's angle is only accepted within a few turns of zero
      const angle = aim.current.angle + sign * (fine ? FINE_STEP : step);
      aim.current.angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      draw(null);
    } else if (key === " ") {
      event.preventDefault();
      if (event.repeat || aim.current.chargeFrom || aim.current.drag) return;
      aim.current.chargeFrom = performance.now();
      animate();
    } else if (MOVES[key.toLowerCase()] && shownRef.current.inHand) {
      event.preventDefault();
      const [dx, dy] = MOVES[key.toLowerCase()];
      const cue = cueFor(shownRef.current);
      const step = fine ? 0.2 : 1;
      place({ x: cue.x + dx * step, y: cue.y + dy * step });
      draw(null);
    }
  };

  const onKeyUp = (event) => {
    if (event.key !== " " || !aim.current.chargeFrom) return;
    event.preventDefault();
    aim.current.chargeFrom = 0;
    shoot(aim.current.angle, aim.current.power);
  };

  // Letting go of Space somewhere else shouldn't leave the power swinging
  const onBlur = () => {
    aim.current.chargeFrom = 0;
    aim.current.power = 0;
    draw(null);
  };

  const { winner } = shown;
  const myTurn = winner === null && !rolling && shown.turn === me;
  const status =
    winner !== null
      ? winner === me
        ? "You win!"
        : `${partnerName} wins.`
      : rolling
        ? "Rolling…"
        : myTurn
          ? shown.inHand === "kitchen"
            ? "Your break."
            : shown.inHand
              ? "Ball in hand. Your shot."
              : "Your shot."
          : shown.shots === 0
            ? `${partnerName} is breaking…`
            : `${partnerName} is lining up a shot…`;

  const myGroup = playerGroup(shown, me);
  const theirGroup = playerGroup(shown, 1 - me);
  const groups = myGroup
    ? `You: ${groupLine(shown, myGroup)} · ${partnerName}: ${groupLine(shown, theirGroup)}`
    : shown.shots === 0
      ? "Pot a ball on the break to keep going."
      : "Open table. The first ball potted picks your group.";
  const note = shotNote(shown, me, partnerName);
  const hint = shown.inHand
    ? "Drag the white (or W A S D) to place it, then drag back from it and let go to shoot."
    : "Drag back from the white and let go to shoot.";

  return (
    <>
      <Status>{status}</Status>
      <Score>{groups}</Score>
      <Table>
        <Canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Pool table. ${status} ${note} Aim with the arrows, hold Space to shoot.`}
          $active={myTurn}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onLostPointerCapture={onPointerCancel}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
        />
      </Table>
      <Note aria-live="polite">{note}</Note>
      {myTurn && <Hint>{hint} Or aim with the arrow keys and hold Space.</Hint>}
      {winner !== null && <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />}
    </>
  );
};

const Table = styled.div`
  width: min(100%, 560px);
  margin: 0 auto;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  border-radius: 10px;
  touch-action: none;
  cursor: ${({ $active }) => ($active ? "crosshair" : "default")};

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 3px;
  }
`;

const Note = styled.p`
  min-height: 1.4em;
  margin: 12px 0 0;
  color: ${inkSoft};
  font: 600 16px / 1.4 ${body};
  text-align: center;
`;

const Hint = styled.p`
  margin: 6px 0 0;
  color: ${inkSoft};
  font: 14px / 1.4 ${body};
  text-align: center;
`;

export default Pool;
