import { useCallback, useEffect, useReducer, useRef } from "react";
import styled from "styled-components";
import { crimson, focusBlue, inkSoft } from "../UserInterface/Modal.jsx";
import { AgainBar, Score, Status } from "./gameParts.jsx";
import { clamp, meterPower, prefersLessMotion } from "./tossPutt.js";
import {
  BALL_RADIUS,
  CUP_BASE,
  CUP_HEIGHT,
  CUP_RIM,
  CUP_SPOTS,
  FRAMES_PER_SECOND,
  MAX_AIM,
  RELEASE,
  TABLE_LENGTH,
  TABLE_WIDTH,
  applyThrow,
  cupWinner,
  cupsLeft,
  flyBall,
  mirror,
  newCupGame,
  readThrow,
  throwVelocity,
  thrower,
  writeThrow,
} from "./cupToss.js";

// The one who sent the invite has crimson cups, and the other gold, as in Connect Four
const cupColour = (player) => (player === 0 ? crimson : "#E8B21F");

// The canvas is this tall for its width
const ASPECT = 0.87;
// A camera stood behind this player's end of the table, looking down it
const CAMERA = { y: 0.85, z: -0.95, pitch: 0.36, focal: 1.45, middle: 0.36 };
const PITCH_SIN = Math.sin(CAMERA.pitch);
const PITCH_COS = Math.cos(CAMERA.pitch);

// A flick this much of the canvas's height long is full power. Its angle is scaled down to the
// aim, so a flick that leans a little turns the throw a little.
const FULL_FLICK = 0.62;
const FLICK_TURN = 0.4;
const SHORTEST_FLICK = 12;
const AIM_STEP = 0.004;
const SPLASH_MS = 600;
// The meter moves slower here than in golf, as the cups only take a narrow band of power
const METER_MS = 2600;

// Where a point on the table shows on a canvas width by height, and how many pixels a metre is
// there, so things further away come out smaller
function project(x, y, z, width, height) {
  const up = y - CAMERA.y;
  const along = z - CAMERA.z;
  const depth = along * PITCH_COS - up * PITCH_SIN;
  const lift = up * PITCH_COS + along * PITCH_SIN;
  const scale = (CAMERA.focal * height) / depth;
  return { x: width / 2 + x * scale, y: height * CAMERA.middle - lift * scale, scale, depth };
}

function drawCup(ctx, spot, colour, width, height) {
  const rim = project(spot.x, CUP_HEIGHT, spot.z, width, height);
  const base = project(spot.x, 0, spot.z, width, height);
  const rimR = CUP_RIM * rim.scale;
  const baseR = CUP_BASE * base.scale;
  // How flat the rim looks from up here
  const squash = Math.abs(project(spot.x, CUP_HEIGHT, spot.z + CUP_RIM, width, height).y - rim.y);

  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(rim.x - rimR, rim.y);
  ctx.lineTo(base.x - baseR, base.y);
  ctx.ellipse(base.x, base.y, baseR, (squash * baseR) / rimR, 0, Math.PI, 0, true);
  ctx.lineTo(rim.x + rimR, rim.y);
  ctx.closePath();
  ctx.fill();
  // A soft shine down one side, so it reads as round
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(rim.x - rimR * 0.55, rim.y, rimR * 0.18, base.y - rim.y);

  ctx.fillStyle = "#F4F1EA";
  ctx.beginPath();
  ctx.ellipse(rim.x, rim.y, rimR, squash, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6B3B1D";
  ctx.beginPath();
  ctx.ellipse(rim.x, rim.y + squash * 0.12, rimR * 0.84, squash * 0.74, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBall(ctx, [x, y, z], width, height) {
  const ball = project(x, y, z, width, height);
  // Anything that's come round behind the camera isn't seen
  if (ball.depth < 0.1) return;
  const r = Math.max(2, BALL_RADIUS * ball.scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "rgba(20, 35, 90, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Draws one frame. scene holds what's on the table as this player sees it: mine and theirs are
// which cups are up, ball is [x, y, z] or null, and the rest is the aiming help.
function drawTable(ctx, width, height, scene) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#CFE8F1");
  sky.addColorStop(0.45, "#A9CCDA");
  sky.addColorStop(1, "#6E8C9C");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const at = (x, y, z) => project(x, y, z, width, height);
  const half = TABLE_WIDTH / 2;
  const corners = [at(-half, 0, 0), at(half, 0, 0), at(half, 0, TABLE_LENGTH), at(-half, 0, TABLE_LENGTH)];
  const lip = [at(-half, -0.05, 0), at(half, -0.05, 0)];
  ctx.fillStyle = "#6F4526";
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(lip[1].x, lip[1].y);
  ctx.lineTo(lip[0].x, lip[0].y);
  ctx.fill();
  ctx.fillStyle = "#2E7D5B";
  ctx.beginPath();
  corners.forEach((corner, i) => (i ? ctx.lineTo(corner.x, corner.y) : ctx.moveTo(corner.x, corner.y)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const middleLeft = at(-half, 0, TABLE_LENGTH / 2);
  const middleRight = at(half, 0, TABLE_LENGTH / 2);
  ctx.beginPath();
  ctx.moveTo(middleLeft.x, middleLeft.y);
  ctx.lineTo(middleRight.x, middleRight.y);
  ctx.stroke();

  if (scene.aim !== null) {
    // A line along the table the way the throw is pointing. It says nothing about how far.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    for (let d = 0.35; d <= TABLE_LENGTH + 0.05; d += 0.1) {
      const point = at(Math.sin(scene.aim) * d, 0, RELEASE.z + Math.cos(scene.aim) * d);
      if (d === 0.35) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Far things first, so nearer ones are drawn over them
  const things = [
    ...CUP_SPOTS.map((spot, i) => ({ spot, up: scene.theirs[i], colour: scene.theirColour })),
    ...CUP_SPOTS.map((spot, i) => ({ spot: mirror(spot), up: scene.mine[i], colour: scene.myColour })),
  ]
    .filter((cup) => cup.up)
    .map((cup) => ({
      depth: at(cup.spot.x, 0, cup.spot.z).depth,
      draw: () => drawCup(ctx, cup.spot, cup.colour, width, height),
    }));
  if (scene.ball) {
    const [x, y, z] = scene.ball;
    const onTable = Math.abs(x) <= half && z >= 0 && z <= TABLE_LENGTH;
    if (onTable && y >= 0) {
      const shadow = at(x, 0, z);
      const size = BALL_RADIUS * shadow.scale;
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, size, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    things.push({ depth: at(x, 0, z).depth - 0.001, draw: () => drawBall(ctx, scene.ball, width, height) });
  }
  things.sort((a, b) => b.depth - a.depth).forEach((thing) => thing.draw());

  if (scene.splash) {
    const rim = at(scene.splash.spot.x, CUP_HEIGHT, scene.splash.spot.z);
    const grown = 1 + scene.splash.progress;
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - scene.splash.progress})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(rim.x, rim.y, CUP_RIM * rim.scale * grown, CUP_RIM * rim.scale * grown * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (scene.flick) {
    const { from, to } = scene.flick;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  if (scene.power !== null) {
    const barHeight = height * 0.5;
    const top = height * 0.25;
    ctx.fillStyle = "rgba(20, 35, 90, 0.35)";
    ctx.fillRect(width - 26, top, 12, barHeight);
    ctx.fillStyle = "#FFFFFF";
    const filled = barHeight * scene.power;
    ctx.fillRect(width - 26, top + barHeight - filled, 12, filled);
  }
}

const CupToss = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  const them = 1 - me;
  // game is what's been thrown, and shown is what's on screen, which catches up once each
  // throw's flight has played out
  const play = useRef({
    game: newCupGame(),
    shown: newCupGame(),
    queue: [],
    flight: null,
    splash: null,
    aim: 0,
    meterFrom: null,
    flick: null,
  });
  const [, rerender] = useReducer((n) => n + 1, 0);
  const canvasRef = useRef(null);
  const size = useRef({ width: 0, height: 0 });
  const frame = useRef(0);

  const myTurn = useCallback(() => {
    const p = play.current;
    return (
      !p.flight &&
      !p.queue.length &&
      cupWinner(p.game) === null &&
      thrower(p.game, match) === me
    );
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
      let ball = null;
      if (p.flight) {
        const index = Math.floor(((now - p.flight.start) / 1000) * FRAMES_PER_SECOND);
        const last = p.flight.frames.length - 1;
        // A ball that went in is hidden inside its cup
        ball = index < last || p.flight.cup < 0 ? p.flight.frames[Math.min(index, last)] : null;
      }
      const ready = myTurn();
      const flickPower = p.flick
        ? clamp(Math.hypot(p.flick.to.x - p.flick.from.x, p.flick.to.y - p.flick.from.y) / (height * FULL_FLICK), 0, 1)
        : null;
      drawTable(ctx, width, height, {
        mine: p.shown.cups[me],
        theirs: p.shown.cups[them],
        myColour: cupColour(me),
        theirColour: cupColour(them),
        ball: ball ?? (ready ? [RELEASE.x, RELEASE.y, RELEASE.z] : null),
        aim: ready ? p.aim : null,
        flick: p.flick,
        power: p.meterFrom !== null ? meterPower(now - p.meterFrom, METER_MS) : flickPower,
        splash: p.splash && {
          spot: p.splash.spot,
          progress: clamp((now - p.splash.at) / SPLASH_MS, 0, 1),
        },
      });
    },
    [me, them, myTurn]
  );

  // Draws frames only while something is moving
  const animate = useCallback(() => {
    if (frame.current) return;
    const tick = (now) => {
      frame.current = 0;
      const p = play.current;
      if (p.flight && now - p.flight.start >= (p.flight.frames.length / FRAMES_PER_SECOND) * 1000) {
        land(now);
      }
      if (p.splash && now - p.splash.at >= SPLASH_MS) p.splash = null;
      paint(now);
      if (p.flight || p.splash || p.meterFrom !== null || p.flick) {
        frame.current = requestAnimationFrame(tick);
      }
    };
    frame.current = requestAnimationFrame(tick);

    // The ball has come down, so the screen catches up with that throw and moves on to the next
    function land(now) {
      const p = play.current;
      const { after, cup, by } = p.flight;
      p.shown = after;
      if (cup >= 0) {
        const spot = by === me ? CUP_SPOTS[cup] : mirror(CUP_SPOTS[cup]);
        p.splash = { spot, at: now };
      }
      p.flight = null;
      startNext(now);
    }

    function startNext(now) {
      const p = play.current;
      while (p.queue.length && !p.flight) {
        const next = p.queue.shift();
        if (prefersLessMotion()) p.shown = next.after;
        else p.flight = { ...next, start: now };
      }
      rerender();
    }
  }, [me, paint]);

  const queueFlight = useCallback(
    (flight) => {
      const p = play.current;
      if (prefersLessMotion() && !p.flight && !p.queue.length) {
        p.shown = flight.after;
        rerender();
        paint(performance.now());
        return;
      }
      if (p.flight) p.queue.push(flight);
      else p.flight = { ...flight, start: performance.now() };
      rerender();
      animate();
    },
    [animate, paint]
  );

  const toss = useCallback(
    (aim, power) => {
      const p = play.current;
      if (!myTurn()) return;
      const velocity = throwVelocity(aim, power);
      const { frames, cup } = flyBall(velocity, p.game.cups[them]);
      const throws = p.game.throws;
      p.game = applyThrow(p.game, match, cup);
      sendMove("play", { data: writeThrow(throws, velocity, cup) });
      queueFlight({ frames, cup, by: me, after: p.game });
    },
    [match, me, them, myTurn, queueFlight, sendMove]
  );

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const p = play.current;
        if (message.kind !== "play") return;
        if (cupWinner(p.game) !== null || thrower(p.game, match) !== them) return;
        const read = readThrow(message.data, p.game);
        if (!read) return;
        // Their throw, flown at this player's cups and turned round to be seen from this end.
        // Where it ends up is whatever they say it did.
        const { frames } = flyBall(read.velocity, p.game.cups[me]);
        p.game = applyThrow(p.game, match, read.cup);
        const turned = frames.map(([x, y, z]) => {
          const point = mirror({ x, y, z });
          return [point.x, point.y, point.z];
        });
        queueFlight({ frames: turned, cup: read.cup, by: them, after: p.game });
      }),
    [listenMoves, match, me, them, queueFlight]
  );

  // Keeps the canvas as wide as its box, with a pixel for every screen pixel
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const width = canvas.parentElement.clientWidth;
      const height = Math.round(width * ASPECT);
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

  const pointAt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event) => {
    if (!myTurn() || play.current.meterFrom !== null) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const from = pointAt(event);
    play.current.flick = { from, to: from };
    animate();
  };

  const onPointerMove = (event) => {
    const p = play.current;
    if (p.flick) p.flick = { ...p.flick, to: pointAt(event) };
  };

  const onPointerUp = (event) => {
    const p = play.current;
    if (!p.flick) return;
    const { from } = p.flick;
    const to = pointAt(event);
    p.flick = null;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // Only a flick up the table throws. Anything else is a change of mind.
    if (dy > -SHORTEST_FLICK) {
      paint(performance.now());
      return;
    }
    const power = clamp(Math.hypot(dx, dy) / (size.current.height * FULL_FLICK), 0, 1);
    const aim = clamp(Math.atan2(dx, -dy) * FLICK_TURN, -MAX_AIM, MAX_AIM);
    p.aim = aim;
    toss(aim, power);
  };

  const onPointerCancel = () => {
    play.current.flick = null;
    paint(performance.now());
  };

  const onKeyDown = (event) => {
    const p = play.current;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -AIM_STEP : AIM_STEP;
      p.aim = clamp(p.aim + step, -MAX_AIM, MAX_AIM);
      paint(performance.now());
    } else if (event.key === " ") {
      event.preventDefault();
      if (event.repeat || p.meterFrom !== null || p.flick || !myTurn()) return;
      p.meterFrom = performance.now();
      animate();
    }
  };

  const onKeyUp = (event) => {
    const p = play.current;
    if (event.key !== " " || p.meterFrom === null) return;
    event.preventDefault();
    const power = meterPower(performance.now() - p.meterFrom, METER_MS);
    p.meterFrom = null;
    toss(p.aim, power);
  };

  // Letting go of Space somewhere else doesn't throw
  const onBlur = () => {
    play.current.meterFrom = null;
    paint(performance.now());
  };

  const p = play.current;
  const flying = p.flight || p.queue.length;
  const winner = flying ? null : cupWinner(p.shown);
  const ready = myTurn();
  let status;
  if (winner !== null) {
    status = winner === me ? "You cleared them all. You win!" : `${partnerName} cleared your cups.`;
  } else if (p.flight) {
    status = p.flight.by === me ? "Up it goes…" : `${partnerName} throws…`;
  } else {
    const last = p.shown.last;
    let said = "";
    if (last && last.cup >= 0) said = last.by === me ? "In! " : "They sank one. ";
    else if (last && last.by === me) said = "Missed. ";
    status = `${said}${ready ? "Your throw." : `${partnerName}'s throw…`}`;
  }

  return (
    <>
      <Score>
        Your cups {cupsLeft(p.shown.cups[me])} · {partnerName}&apos;s {cupsLeft(p.shown.cups[them])}
      </Score>
      <Status aria-live="polite">{status}</Status>
      <Stage>
        <Canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Cup Toss table. ${status} Aim with the left and right arrows, then hold and let go of Space to throw.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
        />
      </Stage>
      {winner !== null ? (
        <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />
      ) : (
        <Hint>Flick up to throw: a longer flick goes further. Or aim with ← → and hold Space.</Hint>
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

const Hint = styled.p`
  margin: 12px 0 0;
  text-align: center;
  color: ${inkSoft};
  font-size: 15px;
`;

export default CupToss;
