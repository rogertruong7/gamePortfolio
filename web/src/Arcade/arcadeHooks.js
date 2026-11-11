import { useCallback, useEffect, useRef, useState } from "react";

// What the arcade games share besides what's on screen (arcadeParts.jsx)

const coarseQuery = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(pointer: coarse)")
    : null;

// Whether this is a touch screen, which gets buttons instead of the keyboard hint
export function useTouchScreen() {
  const [touch, setTouch] = useState(() => coarseQuery()?.matches ?? false);
  useEffect(() => {
    const query = coarseQuery();
    if (!query) return undefined;
    const onChange = () => setTouch(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return touch;
}

// Runs onHidden when the tab is put away, so a game can pause itself
export function usePauseWhenHidden(onHidden) {
  useEffect(() => {
    const onChange = () => {
      if (document.hidden) onHidden();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [onHidden]);
}

// How long R has to be held to start the game again, so a slip of the finger doesn't
export const RESTART_HOLD_MS = 700;

// Holding R starts the game again. progress runs from 0 to 1 while it's held, and is 0 otherwise.
// keyDown and keyUp take the game's key events and say whether they were R's, and cancel stops a
// hold early, for when the game loses focus.
export function useHoldToRestart(onRestart) {
  const [progress, setProgress] = useState(0);
  const hold = useRef(null);
  const restartRef = useRef(onRestart);
  restartRef.current = onRestart;

  const cancel = useCallback(() => {
    if (hold.current) {
      clearTimeout(hold.current.timer);
      cancelAnimationFrame(hold.current.frame);
    }
    hold.current = null;
    setProgress(0);
  }, []);

  useEffect(() => cancel, [cancel]);

  const keyDown = useCallback(
    (event) => {
      if (event.key.toLowerCase() !== "r" || event.metaKey || event.ctrlKey || event.altKey) {
        return false;
      }
      event.preventDefault();
      // Still held from the last restart, it has to be let go and pressed again
      if (hold.current || event.repeat) return true;
      // When the key went down and up, not when a busy page got round to hearing it, so a tap
      // stays a tap
      const start = event.timeStamp;
      // A timer does the restart, so it still happens on time when frames are slow, and the
      // frames only move the bar along
      const timer = setTimeout(() => {
        cancel();
        restartRef.current();
      }, RESTART_HOLD_MS);
      const tick = () => {
        if (!hold.current) return;
        setProgress(Math.min(1, (performance.now() - start) / RESTART_HOLD_MS));
        hold.current.frame = requestAnimationFrame(tick);
      };
      hold.current = { start, timer, frame: requestAnimationFrame(tick) };
      return true;
    },
    [cancel]
  );

  const keyUp = useCallback(
    (event) => {
      if (event.key.toLowerCase() !== "r") return false;
      // Held long enough, but a busy page hadn't got round to the timer yet
      const long = hold.current && event.timeStamp - hold.current.start >= RESTART_HOLD_MS;
      cancel();
      if (long) restartRef.current();
      return true;
    },
    [cancel]
  );

  return { progress, keyDown, keyUp, cancel };
}
