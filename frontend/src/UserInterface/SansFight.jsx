import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FADE_MS = REDUCED_MOTION ? 0 : 1200;
// If the game never starts, the player is let go rather than left stuck in the pond. Nothing has
// covered the town by then, so it stays upside down instead of jumping to the normal world.
const LOAD_TIMEOUT_MS = 20000;

// Fades as a whole, so the town shows through while the fight comes in and goes away
const Fade = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  background: black;
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
  transition: opacity ${FADE_MS}ms ease-in-out;
  pointer-events: none;
`;

const Frame = styled.iframe`
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  pointer-events: auto;
`;

// Stops clicks reaching the town and the buttons over it until the fight has gone
const ClickBlocker = styled.div`
  position: fixed;
  inset: 0;
  z-index: 149;
  cursor: default;
`;

const RunAway = styled.button`
  font-family: "Pixelify Sans", serif;
  ${chromeButton}
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 151;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
`;

// The game runs from public/sans-fight in a frame of its own. Its page says when the battle has
// started and how it ended. onEnd gets "died", "won", "fled" or "failed", and onClosed runs once
// it's faded.
const SansFight = ({ muted, onCovered, onEnd, onClosed }) => {
  const frameRef = useRef(null);
  const endedRef = useRef(false);
  const timersRef = useRef([]);
  // The site's mute setting only matters as the game loads
  const src = useRef(`/sans-fight/index.html?mode=normal${muted ? "&muted" : ""}`).current;
  const [shown, setShown] = useState(false);
  const [ended, setEnded] = useState(false);

  const after = useCallback((ms, callback) => {
    timersRef.current.push(setTimeout(callback, ms));
  }, []);

  const end = useCallback(
    (outcome) => {
      if (endedRef.current) return;
      endedRef.current = true;
      onEnd(outcome);
      setShown(false);
      setEnded(true);
      after(FADE_MS, onClosed);
    },
    [after, onClosed, onEnd]
  );

  useEffect(() => {
    const timers = timersRef.current;
    const loadTimeout = setTimeout(() => end("failed"), LOAD_TIMEOUT_MS);

    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data?.sansFight;
      if (message === "started") {
        clearTimeout(loadTimeout);
        setShown(true);
        frameRef.current.contentWindow.focus();
        after(FADE_MS, () => {
          if (!endedRef.current) onCovered();
        });
      } else if (message === "died" || message === "won" || message === "fled") {
        end(message);
      }
    }

    // Until the game has the keyboard, Escape arrives here
    function onKeyDown(event) {
      if (event.key === "Escape") end("fled");
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(loadTimeout);
      timers.forEach(clearTimeout);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [after, end, onCovered]);

  return (
    <>
      {!ended && <ClickBlocker />}
      <Fade $shown={shown}>
        {/* Removing it stops the music at once, while the black keeps fading */}
        {!ended && <Frame ref={frameRef} src={src} title="Sans fight" allow="autoplay" />}
      </Fade>
      {!ended && (
        <RunAway onClick={() => end("fled")}>
          Run away (Esc)
          <ChromeFrame />
        </RunAway>
      )}
    </>
  );
};

export default SansFight;
