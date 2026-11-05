import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FADE_MS = REDUCED_MOTION ? 0 : 600;
// If the game never starts, the player is let go rather than left stuck in the pond. Nothing has
// covered the town by then, so it stays upside down instead of jumping to the normal world.
const LOAD_TIMEOUT_MS = 20000;

// Fades as a whole, button included, so the town shows through while the fight comes in and goes away
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
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1;
  pointer-events: auto;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
`;

// The game runs from public/sans-fight in a frame of its own. It's mounted as the jump starts, so
// it can load during the dive, and waits paused until ready is true. Its page says when the battle
// has started and how it ended. onEnd runs as it starts fading away, and onClosed once it has,
// with "died", "won", "fled" or "failed".
const SansFight = ({ ready, muted, onCovered, onEnd, onClosed }) => {
  const frameRef = useRef(null);
  const endedRef = useRef(false);
  const timersRef = useRef([]);
  // The site's mute setting only matters as the game loads
  const src = useRef(`/sans-fight/index.html?mode=normal${muted ? "&muted" : ""}`).current;
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState(false);
  const [ended, setEnded] = useState(false);

  const after = useCallback((ms, callback) => {
    timersRef.current.push(setTimeout(callback, ms));
  }, []);

  const end = useCallback(
    (outcome) => {
      if (endedRef.current) return;
      endedRef.current = true;
      onEnd();
      setShown(false);
      setEnded(true);
      after(FADE_MS, () => onClosed(outcome));
    },
    [after, onClosed, onEnd]
  );

  useEffect(() => {
    if (!ready || endedRef.current) return;
    if (!loaded) {
      const loadTimeout = setTimeout(() => end("failed"), LOAD_TIMEOUT_MS);
      return () => clearTimeout(loadTimeout);
    }
    setShown(true);
    const game = frameRef.current.contentWindow;
    game.startFight();
    game.focus();
    after(FADE_MS, () => {
      if (!endedRef.current) onCovered();
    });
  }, [ready, loaded, after, end, onCovered]);

  useEffect(() => {
    const timers = timersRef.current;

    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data?.sansFight;
      if (message === "started") {
        setLoaded(true);
      } else if (message === "died" || message === "won" || message === "fled") {
        end(message);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("message", onMessage);
    };
  }, [end]);

  // Until the game has the keyboard, Escape arrives here
  useEffect(() => {
    if (!shown) return;
    function onKeyDown(event) {
      if (event.key === "Escape") end("fled");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shown, end]);

  return (
    <>
      <ClickBlocker />
      <Fade $shown={shown}>
        {/* Removing it stops the music at once, while the black keeps fading */}
        {!ended && <Frame ref={frameRef} src={src} title="Sans fight" allow="autoplay" />}
        {shown && (
          <RunAway onClick={() => end("fled")}>
            Run away (Esc)
            <ChromeFrame />
          </RunAway>
        )}
      </Fade>
    </>
  );
};

export default SansFight;
