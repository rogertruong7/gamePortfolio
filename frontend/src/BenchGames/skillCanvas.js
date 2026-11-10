import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import styled from "styled-components";
import { crimson, focusBlue, inkSoft, pixel } from "../UserInterface/Modal.jsx";
import { newSeed } from "./random.js";
import { isCount } from "./skillShots.js";

// What darts, hoops and archery share on screen: a canvas that fits its box, a draw loop that only
// runs while something moves, and taking turns at throwing with the other player.

// The one who sent the invite throws in crimson, and the other in green
export const PLAYER_COLOURS = [crimson, "#2C8C5A"];
export const CANVAS_FONT = pixel;

// A throw from the other player can run ahead of the one before it by this much and still wait
// its turn, and anything further is thrown away rather than kept
const MOST_AHEAD = 4;

const motionQuery = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => motionQuery()?.matches ?? false);
  useEffect(() => {
    const query = motionQuery();
    if (!query) return undefined;
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// A canvas drawn in a world width by height units across, scaled to however wide it is on the
// page and sharp on high-density screens. draw(context, now) paints a frame and returns true to
// be called again next frame, so nothing runs while the picture is still.
export function useCanvas(width, height, draw) {
  const canvasRef = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const frame = useRef(0);

  const paint = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const across = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const down = Math.max(1, Math.round((across * height) / width));
    if (canvas.width !== across || canvas.height !== down) {
      canvas.width = across;
      canvas.height = down;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(across / width, 0, 0, down / height, 0, 0);
    context.clearRect(0, 0, width, height);
    if (drawRef.current(context, performance.now()) && !frame.current) {
      frame.current = requestAnimationFrame(paint);
    }
  }, [width, height]);

  const wake = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  // Every change on screen might start something moving
  useEffect(() => {
    wake();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(wake);
    if (canvas) observer?.observe(canvas);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [wake]);

  // Where a pointer is in world units
  const toWorld = useCallback(
    (event) => {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) * width) / rect.width,
        y: ((event.clientY - rect.top) * height) / rect.height,
      };
    },
    [width, height]
  );

  // How many world units one CSS pixel is, for keeping a finger from covering the aim
  const unitsPerPixel = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect?.width ? width / rect.width : 1;
  }, [width]);

  return { canvasRef, toWorld, unitsPerPixel, wake };
}

// The two players take turns at throws numbered from 0, and the thrower's screen works out each
// result and sends it in one play message as { n, ...its numbers }. The other screen takes the sent
// score as it is, so both always agree on it. A seeded game also has the inviter send { seed }
// first, so the wind or the hoop's place is the same on both screens.
//
// rules are readThrow(data) (an entry, or null if it doesn't make sense), throwerOf(n) (0 for the
// inviter, 1 for the other) and isOver(throws). Each throw lands on screen in turn: flightAt(now,
// durationOf) says which one is in the air and how far along it is, and landed counts those down.
export function useThrowGame({ host, match, sendMove, listenMoves, seeded, rules }) {
  const me = host ? 0 : 1;
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const game = useRef(null);
  if (!game.current) {
    game.current = {
      seed: host && seeded ? newSeed() : null,
      throws: [],
      ahead: new Map(),
      landed: 0,
      flight: { index: -1, start: 0 },
    };
  }
  const [, redraw] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    if (host && seeded) sendMove("play", { data: { seed: game.current.seed } });
  }, [host, seeded, sendMove]);

  // Takes the other player's throws that are next in line
  const takeAhead = useCallback(() => {
    const g = game.current;
    const { readThrow, throwerOf, isOver } = rulesRef.current;
    while (g.ahead.has(g.throws.length) && !isOver(g.throws)) {
      const n = g.throws.length;
      const data = g.ahead.get(n);
      g.ahead.delete(n);
      const entry = throwerOf(n) === me ? null : readThrow(data);
      if (!entry) break;
      g.throws = [...g.throws, { ...entry, n, player: 1 - me }];
    }
    redraw();
  }, [me]);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        if (message.kind !== "play") return;
        const g = game.current;
        const { data } = message;
        if (data.seed !== undefined) {
          // The first one counts. A second (React runs effects twice in development) is the same.
          if (seeded && !host && g.seed === null && Number.isInteger(data.seed) && data.seed >= 0) {
            g.seed = data.seed;
            redraw();
          }
          return;
        }
        // A repeat, an old one, or too far ahead to be real
        if (!isCount(data.n) || data.n < g.throws.length || g.ahead.has(data.n)) return;
        if (data.n > g.throws.length + MOST_AHEAD) return;
        g.ahead.set(data.n, data);
        takeAhead();
      }),
    [listenMoves, match, host, seeded, takeAhead]
  );

  const g = game.current;
  const { throwerOf, isOver } = rules;
  const ready = !seeded || g.seed !== null;
  const over = isOver(g.throws);
  const next = g.throws.length;
  const settled = g.landed >= next;
  const myTurn = ready && settled && !over && throwerOf(next) === me;

  // This player's throw, worked out from their aim. Says whether it went.
  const throwNow = useCallback(
    (data) => {
      const current = game.current;
      const n = current.throws.length;
      const { readThrow, throwerOf: whose, isOver: done } = rulesRef.current;
      if (seeded && current.seed === null) return false;
      if (current.landed < n || done(current.throws) || whose(n) !== me) return false;
      const entry = readThrow({ ...data, n });
      if (!entry) return false;
      if (!sendMove("play", { data: { ...data, n } })) return false;
      current.throws = [...current.throws, { ...entry, n, player: me }];
      redraw();
      return true;
    },
    [me, seeded, sendMove]
  );

  const flightAt = useCallback((now, durationOf) => {
    const current = game.current;
    const index = current.landed;
    if (index >= current.throws.length) return null;
    if (current.flight.index !== index) current.flight = { index, start: now };
    const entry = current.throws[index];
    const duration = durationOf(entry);
    const progress = duration > 0 ? Math.min(1, (now - current.flight.start) / duration) : 1;
    if (progress >= 1) {
      current.landed = index + 1;
      redraw();
    }
    return { entry, progress };
  }, []);

  return {
    me,
    seed: g.seed,
    throws: g.throws,
    landed: g.landed,
    shown: g.throws.slice(0, g.landed),
    next,
    ready,
    over: over && settled,
    myTurn,
    throwNow,
    flightAt,
  };
}

// Sized to its box, at most 460px across. touch-action keeps a drag on it from scrolling the page.
export const GameCanvas = styled.canvas`
  display: block;
  width: min(100%, 460px);
  aspect-ratio: ${({ $ratio }) => $ratio};
  margin: 0 auto;
  border-radius: 14px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: ${({ $active }) => ($active ? "crosshair" : "default")};

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 3px;
  }
`;

export const Hint = styled.p`
  max-width: 460px;
  margin: 12px auto 0;
  text-align: center;
  color: ${inkSoft};
  font-size: 15px;
`;

export const LastThrow = styled.p`
  min-height: 1.3em;
  margin: 12px 0 0;
  text-align: center;
  font: 600 18px / 1.3 ${pixel};
  font-variant-ligatures: none;
  color: ${inkSoft};
`;

// The canvas gets the keys, but the popup puts its own button in focus as it opens, after this
// screen's effects have run, so this waits a moment
export function useFocusOnStart(ref) {
  useEffect(() => {
    const timer = setTimeout(() => ref.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [ref]);
}
