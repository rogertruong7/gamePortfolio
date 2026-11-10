import { useEffect, useState } from "react";

// Counts how much of the line is showing from the time since it started, so the first letter is
// there straight away and a slow frame catches up rather than holding the typing back
export function useTypedLength(text, msPerCharacter, typed, onTyped) {
  const [length, setLength] = useState(1);
  useEffect(() => {
    if (typed) return;
    const start = performance.now();
    const timer = setInterval(() => {
      const next = Math.min(text.length, 1 + Math.floor((performance.now() - start) / msPerCharacter));
      setLength(next);
      if (next === text.length) onTyped();
    }, msPerCharacter);
    return () => clearInterval(timer);
  }, [text, msPerCharacter, typed, onTyped]);
  return typed ? text.length : length;
}
