import { useCallback, useEffect, useReducer, useRef } from "react";
import styled from "styled-components";
import { crimson, focusBlue, ink, inkSoft, pixel } from "../../../UserInterface/Modal.jsx";
import { AgainBar, Score, Status } from "../../shared/gameParts.jsx";
import { clamp, meterPower, prefersLessMotion } from "../../shared/tossPutt.js";
import {
  BALL_RADIUS,
  COURSE_HEIGHT,
  COURSE_WIDTH,
  CUP_RADIUS,
  FRAMES_PER_SECOND,
  HOLES,
  MAX_STROKES,
  applyStroke,
  golfTurn,
  golfWinner,
  newGolfGame,
  puttVelocity,
  readStroke,
  rollBall,
  total,
  wallsOf,
  writeStroke,
} from "./miniGolf.js";

// The one who sent the invite is crimson, and the other gold, as in Connect Four
const ballColour = (player) => (player === 0 ? crimson : "#E8B21F");

// Dragging back this far, in course units, is a full-power putt
const FULL_DRAG = 52;
const SHORTEST_DRAG = 3;
const TURN_STEP = Math.PI / 90;
const FINE_TURN_STEP = Math.PI / 720;

const facingCup = (ball, hole) => Math.atan2(hole.cup.y - ball.y, hole.cup.x - ball.x);

function tracePath(ctx, points, scale) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
  ctx.closePath();
}

function drawBall(ctx, x, y, scale, colour, ghost) {
  const r = Math.max(3, BALL_RADIUS * scale);
  ctx.globalAlpha = ghost ? 0.5 : 1;
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.arc(x * scale + 1.5, y * scale + 1.5, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1.5, r * 0.45);
  ctx.beginPath();
  ctx.arc(x * scale, y * scale, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// Draws one frame of a hole from above. scene.balls is [{ x, y, colour, ghost }] for the balls
// still out on the course, and aim and power are the putt being lined up, or null.
function drawHole(ctx, width, height, scene) {
  const scale = width / COURSE_WIDTH;
  const { hole } = scene;
  ctx.fillStyle = "#24583A";
  ctx.fillRect(0, 0, width, height);

  // Grass with mown stripes, kept inside the edge
  ctx.save();
  tracePath(ctx, hole.edge, scale);
  ctx.fillStyle = "#62B868";
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = "#6CC272";
  for (let x = 0; x < COURSE_WIDTH; x += 20) ctx.fillRect(x * scale, 0, 10 * scale, height);
  ctx.restore();

  ctx.fillStyle = "#E8D08E";
  ctx.strokeStyle = "#C9AD62";
  ctx.lineWidth = 1.5;
  hole.sand.forEach((patch) => {
    tracePath(ctx, patch, scale);
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect((hole.tee.x - 4) * scale, (hole.tee.y - 4) * scale, 8 * scale, 8 * scale);

  ctx.fillStyle = "#16301F";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(hole.cup.x * scale, hole.cup.y * scale, CUP_RADIUS * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A little flag stood in the cup, leaning off to one side so it doesn't hide the hole
  const poleX = hole.cup.x * scale;
  const poleY = hole.cup.y * scale;
  ctx.strokeStyle = "#F4F1EA";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(poleX, poleY);
  ctx.lineTo(poleX + 4 * scale, poleY - 10 * scale);
  ctx.stroke();
  ctx.fillStyle = "#F2C230";
  ctx.beginPath();
  ctx.moveTo(poleX + 4 * scale, poleY - 10 * scale);
  ctx.lineTo(poleX + 11 * scale, poleY - 8 * scale);
  ctx.lineTo(poleX + 3 * scale, poleY - 5 * scale);
  ctx.fill();

  hole.bumpers.forEach((bumper) => {
    ctx.fillStyle = "#C8384F";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(1.5, scale * 0.9);
    ctx.beginPath();
    ctx.arc(bumper.x * scale, bumper.y * scale, bumper.r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.strokeStyle = "#7A4E2D";
  ctx.lineWidth = Math.max(3, scale * 2.2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  wallsOf(hole).forEach(([[x1, y1], [x2, y2]]) => {
    ctx.beginPath();
    ctx.moveTo(x1 * scale, y1 * scale);
    ctx.lineTo(x2 * scale, y2 * scale);
    ctx.stroke();
  });

  if (scene.aim !== null && scene.from) {
    // The way the putt will go, longer the harder it's hit
    const reach = 10 + 40 * (scene.power ?? 0.25);
    const startX = scene.from.x * scale;
    const startY = scene.from.y * scale;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(scene.aim) * reach * scale, startY + Math.sin(scene.aim) * reach * scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  scene.balls.forEach((ball) => drawBall(ctx, ball.x, ball.y, scale, ball.colour, ball.ghost));

  if (scene.power !== null) {
    const barHeight = height * 0.6;
    const top = height * 0.2;
    ctx.fillStyle = "rgba(20, 35, 90, 0.4)";
    ctx.fillRect(width - 18, top, 10, barHeight);
    ctx.fillStyle = "#FFFFFF";
    const filled = barHeight * scene.power;
    ctx.fillRect(width - 18, top + barHeight - filled, 10, filled);
  }
}

const MiniGolf = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  const them = 1 - me;
  // game is every stroke played, and shown is what's on screen, which catches up once each
  // stroke's roll has played out
  const play = useRef({
    game: newGolfGame(),
    shown: newGolfGame(),
    queue: [],
    roll: null,
    aim: facingCup(HOLES[0].tee, HOLES[0]),
    meterFrom: null,
    drag: null,
  });
  const [, rerender] = useReducer((n) => n + 1, 0);
  const canvasRef = useRef(null);
  const size = useRef({ width: 0, height: 0 });
  const frame = useRef(0);

  const myTurn = useCallback(() => {
    const p = play.current;
    return !p.roll && !p.queue.length && golfTurn(p.game, match) === me;
  }, [match, me]);

  const paint = useCallback(
    (now) => {
      const canvas = canvasRef.current;
      const { width, height } = size.current;
      if (!canvas || !width) return;
      const p = play.current;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const holeIndex = Math.min(p.shown.hole, HOLES.length - 1);
      const balls = [them, me]
        .map((player) => {
          const ball = p.shown.balls[player];
          const colour = ballColour(player);
          const ghost = player === them;
          if (p.roll?.by === player) {
            const at = Math.floor(((now - p.roll.start) / 1000) * FRAMES_PER_SECOND);
            const [x, y] = p.roll.frames[Math.min(at, p.roll.frames.length - 1)];
            return { x, y, colour, ghost };
          }
          return ball.holed || p.shown.hole >= HOLES.length ? null : { ...ball, colour, ghost };
        })
        .filter(Boolean);
      const ready = myTurn();
      drawHole(ctx, width, height, {
        hole: HOLES[holeIndex],
        balls,
        from: p.shown.balls[me],
        aim: ready ? p.aim : null,
        power: p.meterFrom !== null ? meterPower(now - p.meterFrom) : (p.drag?.power ?? null),
      });
    },
    [me, them, myTurn]
  );

  // The screen catches up with a stroke. A new hole starts lined up on the cup.
  const settle = useCallback(
    (after) => {
      const p = play.current;
      if (after.hole !== p.shown.hole && after.hole < HOLES.length) {
        p.aim = facingCup(after.balls[me], HOLES[after.hole]);
      }
      p.shown = after;
    },
    [me]
  );

  const animate = useCallback(() => {
    if (frame.current) return;
    const tick = (now) => {
      frame.current = 0;
      const p = play.current;
      if (p.roll && now - p.roll.start >= (p.roll.frames.length / FRAMES_PER_SECOND) * 1000) {
        settle(p.roll.after);
        p.roll = null;
        while (p.queue.length && !p.roll) {
          const next = p.queue.shift();
          if (prefersLessMotion()) settle(next.after);
          else p.roll = { ...next, start: now };
        }
        rerender();
      }
      paint(now);
      if (p.roll || p.meterFrom !== null || p.drag) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [paint, settle]);

  const queueRoll = useCallback(
    (roll) => {
      const p = play.current;
      if (prefersLessMotion() && !p.roll && !p.queue.length) {
        settle(roll.after);
        rerender();
        paint(performance.now());
        return;
      }
      if (p.roll) p.queue.push(roll);
      else p.roll = { ...roll, start: performance.now() };
      rerender();
      animate();
    },
    [animate, paint, settle]
  );

  const putt = useCallback(
    (angle, power) => {
      const p = play.current;
      if (!myTurn() || power <= 0) return;
      const velocity = puttVelocity(angle, power);
      const hole = HOLES[p.game.hole];
      const from = p.game.balls[me];
      const { frames, ...end } = rollBall(hole, from, velocity);
      const strokes = p.game.strokes;
      p.game = applyStroke(p.game, match, end);
      sendMove("play", { data: writeStroke(strokes, velocity, end) });
      queueRoll({ frames, by: me, after: p.game });
    },
    [match, me, myTurn, queueRoll, sendMove]
  );

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const p = play.current;
        if (message.kind !== "play" || golfTurn(p.game, match) !== them) return;
        const read = readStroke(message.data, p.game);
        if (!read) return;
        // Their putt rolled again here for the look of it. Where it stops is whatever they say.
        const { frames } = rollBall(HOLES[p.game.hole], p.game.balls[them], read.velocity);
        frames.push([read.end.x, read.end.y]);
        p.game = applyStroke(p.game, match, read.end);
        queueRoll({ frames, by: them, after: p.game });
      }),
    [listenMoves, match, them, queueRoll]
  );

  // Keeps the canvas as wide as its box, with a pixel for every screen pixel
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const width = canvas.parentElement.clientWidth;
      const height = Math.round((width * COURSE_HEIGHT) / COURSE_WIDTH);
      const dpr = window.devicePixelRatio || 1;
      size.current = { width, height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      paint(performance.now());
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);
    canvas.focus();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [paint]);

  // Turn changes and the like need a fresh frame even when nothing's moving
  useEffect(() => {
    if (!frame.current) paint(performance.now());
  });

  // Where the pointer is, in course units
  const pointAt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = rect.width / COURSE_WIDTH;
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  };

  // Dragging works from wherever it starts, so a thumb doesn't have to cover the ball. The putt
  // goes the opposite way to the drag, like pulling back a catapult.
  const onPointerDown = (event) => {
    if (!myTurn() || play.current.meterFrom !== null) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    play.current.drag = { from: pointAt(event), power: 0, length: 0 };
    animate();
  };

  const onPointerMove = (event) => {
    const p = play.current;
    if (!p.drag) return;
    const to = pointAt(event);
    const dx = p.drag.from.x - to.x;
    const dy = p.drag.from.y - to.y;
    const length = Math.hypot(dx, dy);
    if (length >= SHORTEST_DRAG) p.aim = Math.atan2(dy, dx);
    p.drag = { ...p.drag, length, power: clamp(length / FULL_DRAG, 0, 1) };
  };

  const onPointerUp = (event) => {
    onPointerMove(event);
    const p = play.current;
    if (!p.drag) return;
    const { length, power } = p.drag;
    p.drag = null;
    if (length < SHORTEST_DRAG) {
      paint(performance.now());
      return;
    }
    putt(p.aim, power);
  };

  const onPointerCancel = () => {
    play.current.drag = null;
    paint(performance.now());
  };

  const onKeyDown = (event) => {
    const p = play.current;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.shiftKey ? FINE_TURN_STEP : TURN_STEP;
      p.aim += event.key === "ArrowLeft" ? -step : step;
      paint(performance.now());
    } else if (event.key === " ") {
      event.preventDefault();
      if (event.repeat || p.meterFrom !== null || p.drag || !myTurn()) return;
      p.meterFrom = performance.now();
      animate();
    }
  };

  const onKeyUp = (event) => {
    const p = play.current;
    if (event.key !== " " || p.meterFrom === null) return;
    event.preventDefault();
    const power = meterPower(performance.now() - p.meterFrom);
    p.meterFrom = null;
    putt(p.aim, power);
  };

  // Letting go of Space somewhere else doesn't putt
  const onBlur = () => {
    play.current.meterFrom = null;
    paint(performance.now());
  };

  const p = play.current;
  const { shown } = p;
  const winner = p.roll || p.queue.length ? null : golfWinner(shown);
  const over = winner !== null;
  const holeIndex = Math.min(shown.hole, HOLES.length - 1);
  const mine = total(shown.cards[me]);
  const theirs = total(shown.cards[them]);
  let status;
  if (over) {
    if (winner === "draw") status = `All square on ${mine}.`;
    else status = winner === me ? `You win, ${mine} to ${theirs}!` : `${partnerName} wins, ${theirs} to ${mine}.`;
  } else if (p.roll) {
    status = p.roll.by === me ? "Rolling…" : `${partnerName} putts…`;
  } else if (myTurn()) {
    status = `Your putt. Stroke ${shown.balls[me].shots + 1} of ${MAX_STROKES}.`;
  } else {
    status = `${partnerName}'s putt…`;
  }

  return (
    <>
      <Score>
        Hole {holeIndex + 1} of {HOLES.length}: {HOLES[holeIndex].name} · You {mine} ·{" "}
        {partnerName} {theirs}
      </Score>
      <Status aria-live="polite">{status}</Status>
      <Stage>
        <Canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Mini golf, hole ${holeIndex + 1}. ${status} Turn with the left and right arrows (Shift for small turns), then hold and let go of Space to putt.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
        />
      </Stage>
      <Card>
        <tbody>
          {[
            ["You", me],
            [partnerName, them],
          ].map(([name, player]) => (
            <tr key={player}>
              <th scope="row">{name}</th>
              {HOLES.map((hole, i) => (
                <td key={hole.name}>{shown.cards[player][i] ?? "·"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Card>
      {over ? (
        <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />
      ) : (
        <Hint>
          Drag back and let go to putt: the further, the harder. Or turn with ← → and hold Space.
          Six strokes at most, or it scores {MAX_STROKES + 1}.
        </Hint>
      )}
    </>
  );
};

const Stage = styled.div`
  width: min(100%, 460px);
  margin: 0 auto;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  border-radius: 14px;
  touch-action: none;
  cursor: crosshair;

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
  }
`;

const Card = styled.table`
  margin: 12px auto 0;
  border-collapse: collapse;
  color: ${ink};
  font: 600 16px / 1.3 ${pixel};
  font-variant-ligatures: none;

  th {
    max-width: 120px;
    overflow: hidden;
    padding: 2px 10px 2px 0;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  td {
    min-width: 26px;
    padding: 2px 4px;
    text-align: center;
  }
`;

const Hint = styled.p`
  margin: 12px 0 0;
  text-align: center;
  color: ${inkSoft};
  font-size: 15px;
`;

export default MiniGolf;
