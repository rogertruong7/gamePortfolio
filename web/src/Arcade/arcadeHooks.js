import { useEffect, useState } from "react";

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
