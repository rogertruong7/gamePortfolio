import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Typewriter from "typewriter-effect";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Phones have no Escape key, so they're pointed at the button instead
const TOUCH = window.matchMedia("(pointer: coarse)").matches;
const FADE_MS = REDUCED_MOTION ? 0 : 600;
// If the game never starts, the player is let go rather than left stuck in the pond. They stay in
// the upside-down town instead of jumping back to the normal one.
const LOAD_TIMEOUT_MS = 20000;
// How long the game can keep the player waiting after the dive before the screen goes dark to say
// it's on its way. Short enough that it doesn't look stuck, long enough not to flash up and vanish.
const STALL_DELAY_MS = 300;
const WAITING_LINE = "Something strange is happening...";
const TYPING_DELAY = 45;

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

// Covers the frame while the game is still loading, then fades to show it
const Waiting = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  padding: 0 clamp(20px, 6vw, 80px);
  background: black;
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1.2rem, 3.4vw, 3rem);
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  transition: opacity ${FADE_MS}ms ease-in-out;
`;

// Shown under the GAME OVER screen, which waits for the player rather than ending on its own
const ReturnHint = styled.p`
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(8px, 2.5vh, 24px);
  margin: 0;
  text-align: center;
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1rem, 0.8rem + 0.8vw, 1.6rem);
  pointer-events: none;
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
// has started, when the player has died, and how it ended. If it isn't ready by the time the dive ends, the screen goes dark
// with a line to say so until it is. onEnd runs as it starts fading away, and onClosed once it has,
// with "died", "won", "fled" or "failed".
const SansFight = ({ ready, muted, onCovered, onEnd, onClosed }) => {
  const frameRef = useRef(null);
  const endedRef = useRef(false);
  const timersRef = useRef([]);
  // The site's mute setting only matters as the game loads
  const src = useRef(`/sans-fight/index.html?mode=normal${muted ? "&muted" : ""}`).current;
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [gameOver, setGameOver] = useState(false);
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
      const stallTimeout = setTimeout(() => {
        setStalled(true);
        // The town can stop drawing under the dark, which leaves more of the device to the game
        after(FADE_MS, () => {
          if (!endedRef.current) onCovered();
        });
      }, STALL_DELAY_MS);
      const loadTimeout = setTimeout(() => end("failed"), LOAD_TIMEOUT_MS);
      return () => {
        clearTimeout(stallTimeout);
        clearTimeout(loadTimeout);
      };
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
      } else if (message === "gameover") {
        setGameOver(true);
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

  const covering = (shown || stalled) && !ended;

  // Until the game has the keyboard, Escape arrives here
  useEffect(() => {
    if (!covering) return;
    function onKeyDown(event) {
      if (event.key === "Escape") end(gameOver ? "died" : "fled");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [covering, gameOver, end]);

  return (
    <>
      <ClickBlocker />
      <Fade $shown={covering}>
        {/* Removing it stops the music at once, while the black keeps fading */}
        {!ended && <Frame ref={frameRef} src={src} title="Sans fight" allow="autoplay" />}
        {gameOver && !ended && (
          <ReturnHint>{TOUCH ? "* Tap Return to go back" : "* Press Esc to return"}</ReturnHint>
        )}
        {stalled && (
          <Waiting $hidden={loaded} role="status">
            <span aria-hidden="true">*</span>
            {REDUCED_MOTION ? (
              WAITING_LINE
            ) : (
              <Typewriter
                onInit={(typewriter) => {
                  typewriter.changeDelay(TYPING_DELAY).typeString(WAITING_LINE).start();
                }}
              />
            )}
          </Waiting>
        )}
        {covering && (
          <RunAway onClick={() => end(gameOver ? "died" : "fled")}>
            {gameOver ? "Return (Esc)" : "Run away (Esc)"}
            <ChromeFrame />
          </RunAway>
        )}
      </Fade>
    </>
  );
};

export default SansFight;
