import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import Typewriter from "typewriter-effect";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { RESUME_NAME, RESUME_URL } from "../Helpers/resume.js";
import { stopPrefetchingSansFight } from "../Helpers/prefetchSansFight.js";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Phones have no Escape key, so they're pointed at the button instead
const TOUCH = window.matchMedia("(pointer: coarse)").matches;
const FADE_MS = REDUCED_MOTION ? 0 : 600;
// The first time, the game has about 3.2 MB to download before it can start, most of it music,
// which can take a while on a slow connection. It's given as long as it keeps getting files, and
// only given up on once nothing more has arrived for a while, or after this long in all. Then the
// player is jumped back out of the pond, rather than left in the upside-down town.
const NO_PROGRESS_MS = 45000;
const LOAD_TIMEOUT_MS = 180000;
const PROGRESS_CHECK_MS = 250;
// What the game downloads before its battle starts, measured from its page. Only for the bar, so
// it doesn't matter if it's a little out.
const FIGHT_BYTES = 3230000;
// Downloading only fills the bar this far. After that the game still has to get ready, mostly
// decoding its music, which takes a few seconds more the first time. Starting up counts as
// progress too, so a game that's still getting somewhere isn't given up on.
const DOWNLOADED_SHARE = 0.85;
const STARTED_UP_SHARE = 0.92;
// While it gets ready, the bar creeps on towards this over a few seconds rather than sitting still.
// Once the battle starts it fills up, and stays full for a moment before the fight shows.
const GETTING_READY_SHARE = 0.97;
const GETTING_READY_SECONDS = 8;
const FULL_BAR_MS = 400;
// Long enough to read the line saying it didn't work
const FAILED_MS = 2500;
const FAILED_LINE = "But nothing happened.";
// How long the game can keep the player waiting after the dive before the screen goes dark to say
// it's on its way. Short enough that it doesn't look stuck, long enough not to flash up and vanish.
const STALL_DELAY_MS = 300;
const WAITING_LINE = "Roger is making his way here...";
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.2em;
  padding: 0 clamp(20px, 6vw, 80px);
  background: black;
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1.2rem, 3.4vw, 3rem);
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  transition: opacity ${FADE_MS}ms ease-in-out;
  /* Clicks go through to the game underneath, for the same reason */
  pointer-events: none;
`;

const Line = styled.div`
  display: flex;
  gap: 0.6em;
`;

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

// Eight square dots in a ring, turning a dot at a time so it stays blocky like the bar
const Spinner = styled.div`
  position: relative;
  width: 1.6em;
  height: 1.6em;
  animation: ${spin} 0.8s steps(8) infinite;

  & > span {
    position: absolute;
    top: 0;
    left: calc(50% - 0.12em);
    width: 0.24em;
    height: 0.24em;
    background: white;
    transform-origin: 0.12em 0.8em;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SPINNER_DOTS = Array.from({ length: 8 }, (_, i) => i);

const pulse = keyframes`
  from {
    opacity: 0.25;
  }
  to {
    opacity: 0.7;
  }
`;

// How far the game has loaded, as a white box filling up like Undertale's own bars
const LoadBar = styled.div`
  box-sizing: border-box;
  width: min(360px, 70vw);
  height: 22px;
  padding: 3px;
  border: 3px solid white;
`;

const LoadFill = styled.div`
  height: 100%;
  background: white;
  transition: width
    ${({ $creeping }) =>
      $creeping ? `${GETTING_READY_SECONDS}s cubic-bezier(0.2, 0.7, 0.3, 1)` : "0.25s linear"};

  /* Breathes while there's no amount to show, before anything has arrived */
  &[data-unknown] {
    animation: ${pulse} 0.9s ease-in-out infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &[data-unknown] {
      animation: none;
      opacity: 0.4;
    }
  }
`;

// How many bytes the game in the frame has finished downloading, counting files that came from
// the cache. Its engine has a progress of its own, but that stays at nothing while its scripts and
// music download, which is most of the wait.
function downloadedBytes(frame) {
  try {
    return frame.contentWindow.performance
      .getEntriesByType("resource")
      .reduce((total, entry) => total + (entry.encodedBodySize || 0), 0);
  } catch {
    return 0;
  }
}

// Whether the game has finished loading and put up its first screen, though not the battle yet
function startedUp(frame) {
  try {
    return Boolean(frame.contentWindow.cr_getC2Runtime?.()?.running_layout);
  } catch {
    return false;
  }
}

// How far along the bar is, from 0 to 1, or null before anything has arrived
function barProgress(frame) {
  if (startedUp(frame)) return STARTED_UP_SHARE;
  const bytes = downloadedBytes(frame);
  if (bytes === 0) return null;
  return Math.min(1, bytes / FIGHT_BYTES) * DOWNLOADED_SHARE;
}

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

// After a win, so there's a moment to enjoy it before the town comes back
const WIN_SECONDS = 15;

const WinCard = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 3vh, 28px);
  background: black;
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  text-align: center;
  pointer-events: auto;
  cursor: pointer;

  &:focus {
    outline: none;
  }

  h2 {
    margin: 0;
    color: #ffff40;
    font-size: clamp(2.4rem, 8vw, 5rem);
    font-weight: normal;
  }

  p {
    margin: 0;
    font-size: clamp(1rem, 0.8rem + 1vw, 1.8rem);
  }

  small {
    color: #9a9a9a;
    font-size: clamp(0.85rem, 0.7rem + 0.4vw, 1.1rem);
  }
`;

const ResumeLink = styled.a`
  ${chromeButton}
  position: relative;
  padding: 10px 22px;
  color: #14235a;
  font-size: clamp(0.95rem, 0.8rem + 0.5vw, 1.2rem);
  font-weight: 700;
  text-decoration: none;
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
// has started, when the player has died, and how it ended. If it isn't ready by the time the dive
// ends, the screen goes dark with a spinner, a line and a loading bar until it is. onEnd runs as it starts fading away, and onClosed once it has,
// with "died", "won", "fled" or "failed".
const SansFight = ({ ready, muted, onCovered, onEnd, onClosed }) => {
  const frameRef = useRef(null);
  const endedRef = useRef(false);
  const timersRef = useRef([]);
  // The site's mute setting only matters as the game loads
  const src = useRef(
    `/sans-fight/index.html?mode=normal&resume=${encodeURIComponent(RESUME_URL)}${muted ? "&muted" : ""}`
  ).current;
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [progress, setProgress] = useState(null);
  // The loading screen stays up a moment after the battle starts, so the full bar can be seen
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const winCardRef = useRef(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    stopPrefetchingSansFight();
  }, []);

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
        // The game gets the keyboard straight away, so if it's ready and just waiting on a key,
        // whatever the player presses reaches it and starts the fight
        frameRef.current?.contentWindow?.focus();
        // The town can stop drawing under the dark, which leaves more of the device to the game
        after(FADE_MS, () => {
          if (!endedRef.current) onCovered();
        });
      }, STALL_DELAY_MS);
      // Says it didn't work before letting the player go, rather than just dropping them back
      const giveUp = () => {
        clearInterval(progressCheck);
        clearTimeout(loadTimeout);
        setFailed(true);
        after(FAILED_MS, () => end("failed"));
      };
      const loadTimeout = setTimeout(giveUp, LOAD_TIMEOUT_MS);
      let lastProgress;
      let lastMovedAt = performance.now();
      const progressCheck = setInterval(() => {
        const now = barProgress(frameRef.current);
        if (now !== lastProgress) {
          lastProgress = now;
          lastMovedAt = performance.now();
          setProgress(now);
        } else if (performance.now() - lastMovedAt > NO_PROGRESS_MS) {
          giveUp();
        }
      }, PROGRESS_CHECK_MS);
      return () => {
        clearTimeout(stallTimeout);
        clearTimeout(loadTimeout);
        clearInterval(progressCheck);
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
      } else if (message === "won") {
        setWon(true);
      } else if (message === "died" || message === "fled") {
        end(message);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("message", onMessage);
    };
  }, [end]);

  useEffect(() => {
    if (!loaded) return undefined;
    const timer = setTimeout(() => setRevealed(true), FULL_BAR_MS);
    return () => clearTimeout(timer);
  }, [loaded]);

  // What the bar shows: full once the battle has started, and creeping on while it gets ready
  const gettingReady = progress !== null && progress >= DOWNLOADED_SHARE;
  const barShows = loaded ? 1 : gettingReady ? GETTING_READY_SHARE : progress;

  const covering = (shown || stalled) && !ended;

  // Until the game has the keyboard, Escape arrives here
  useEffect(() => {
    if (!covering) return;
    function onKeyDown(event) {
      if (event.key === "Escape") end(won ? "won" : gameOver ? "died" : "fled");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [covering, gameOver, won, end]);

  // The win card waits for any key or click, or goes on its own after a while. The game had the
  // keyboard, so the card takes it back to hear the key.
  useEffect(() => {
    if (!won) return;
    winCardRef.current?.focus();
    const finish = () => end("won");
    // Enter or Space on the resume link downloads it instead of leaving
    const onKeyDown = (event) => {
      if (event.target.closest?.("a")) return;
      finish();
    };
    const timer = setTimeout(finish, WIN_SECONDS * 1000);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [won, end]);

  return (
    <>
      <ClickBlocker />
      <Fade $shown={covering}>
        {/* Removing it stops the music at once, while the black keeps fading */}
        {!ended && <Frame ref={frameRef} src={src} title="Sans fight" allow="autoplay" />}
        {won && !ended && (
          <WinCard ref={winCardRef} tabIndex={-1} role="status" onClick={() => end("won")}>
            <h2>YOU WON!</h2>
            <p>* You earned 0 EXP. No hire this time.</p>
            <p>* But my resume&apos;s still worth a look.</p>
            <ResumeLink
              href={RESUME_URL}
              download={RESUME_NAME}
              onClick={(event) => event.stopPropagation()}
            >
              Download resume
              <ChromeFrame />
            </ResumeLink>
            <small>{TOUCH ? "Tap to go back" : "Press any key to go back"}</small>
          </WinCard>
        )}
        {gameOver && !ended && (
          <ReturnHint>{TOUCH ? "* Tap Return to go back" : "* Press Esc to return"}</ReturnHint>
        )}
        {stalled && (
          <Waiting $hidden={revealed} role="status">
            {!failed && (
              <Spinner aria-hidden="true">
                {SPINNER_DOTS.map((dot) => (
                  <span
                    key={dot}
                    style={{ transform: `rotate(${dot * 45}deg)`, opacity: 0.3 + dot * 0.1 }}
                  />
                ))}
              </Spinner>
            )}
            <Line>
              <span aria-hidden="true">*</span>
              {failed ? (
                FAILED_LINE
              ) : REDUCED_MOTION ? (
                WAITING_LINE
              ) : (
                <Typewriter
                  options={{ delay: TYPING_DELAY }}
                  onInit={(typewriter) => {
                    typewriter.typeString(WAITING_LINE).start();
                  }}
                />
              )}
            </Line>
            {!failed && (
              <LoadBar
                role="progressbar"
                aria-label="Loading the fight"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={barShows === null ? undefined : Math.round(barShows * 100)}
              >
                <LoadFill
                  $creeping={gettingReady && !loaded}
                  data-unknown={barShows === null ? "" : undefined}
                  style={{ width: barShows === null ? "100%" : `${barShows * 100}%` }}
                />
              </LoadBar>
            )}
          </Waiting>
        )}
        {covering && (
          <RunAway onClick={() => end(won ? "won" : gameOver ? "died" : "fled")}>
            {won || gameOver ? "Return (Esc)" : "Run away (Esc)"}
            <ChromeFrame />
          </RunAway>
        )}
      </Fade>
    </>
  );
};

export default SansFight;
