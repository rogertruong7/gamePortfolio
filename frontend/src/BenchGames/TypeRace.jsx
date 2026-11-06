import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import styled from "styled-components";
import { focusBlue, ink, inkSoft, pixel } from "../UserInterface/Modal.jsx";
import { WINS_NEEDED, cantWin, pickWord, roundWinner, typedIt } from "./typing.js";
import { AgainBar, Score, Status } from "./gameParts.jsx";

const FIRST_WORD_AFTER_MS = 800;
const COUNTDOWN_MS = 3000;
const NEXT_WORD_AFTER_MS = 2500;
const TICK_MS = 50;

const seconds = (ms) => (typeof ms === "number" ? `${(ms / 1000).toFixed(2)}s` : "—");

// The one who sent the invite picks each word and sends it over. Both count down from when it
// reaches them, then time themselves from when it appears, so the connection doesn't slow
// either of them down.
const TypeRace = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? "host" : "guest";
  const race = useRef({
    round: -1,
    word: "",
    shownAt: 0,
    // This round's time: undefined until typed, or null once there's no beating theirs
    myTime: undefined,
    theirTimes: new Map(),
    // Who won each round so far, and the two times from the last one
    winners: [],
    lastTimes: null,
    used: [],
    timers: [],
  });
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [typed, setTyped] = useState("");
  const input = useRef(null);

  const current = race.current;
  const wins = current.winners.filter((winner) => winner === me).length;
  const losses = current.winners.length - wins;
  const over = wins >= WINS_NEEDED || losses >= WINS_NEEDED;

  const later = useCallback((ms, run) => {
    race.current.timers.push(setTimeout(run, ms));
  }, []);

  const startRound = useCallback((round, word) => {
    const r = race.current;
    r.round = round;
    r.word = word;
    r.shownAt = performance.now() + COUNTDOWN_MS;
    r.myTime = undefined;
    setTyped("");
    redraw();
    input.current?.focus();
  }, []);

  const sendWord = useCallback(
    (round) => {
      const r = race.current;
      const word = pickWord(r.used);
      r.used.push(word);
      sendMove("word", { round, word });
      startRound(round, word);
    },
    [sendMove, startRound]
  );

  // Once both times for the round are known, both players work out the same winner
  const settle = useCallback(() => {
    const r = race.current;
    if (r.round < 0 || r.winners.length > r.round) return;
    const theirs = r.theirTimes.get(r.round);
    const winner = host ? roundWinner(r.myTime, theirs) : roundWinner(theirs, r.myTime);
    if (!winner) return;
    r.winners = [...r.winners, winner];
    r.lastTimes = { mine: r.myTime, theirs };
    redraw();
    const won = r.winners.filter((w) => w === winner).length;
    if (host && won < WINS_NEEDED) later(NEXT_WORD_AFTER_MS, () => sendWord(r.round + 1));
  }, [host, later, sendWord]);

  const finish = useCallback(
    (time) => {
      const r = race.current;
      if (r.myTime !== undefined) return;
      r.myTime = time;
      sendMove("typed", { round: r.round, time });
      settle();
      redraw();
    },
    [sendMove, settle]
  );

  useEffect(() => {
    const r = race.current;
    if (host) later(FIRST_WORD_AFTER_MS, () => sendWord(0));
    input.current?.focus();
    return () => {
      r.timers.forEach(clearTimeout);
      r.timers = [];
    };
  }, [host, later, sendWord]);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const r = race.current;
        if (message.kind === "word" && !host) {
          if (message.round === r.winners.length && message.round > r.round) {
            startRound(message.round, message.word);
          }
        } else if (message.kind === "typed" && message.round >= r.winners.length) {
          if (!r.theirTimes.has(message.round)) r.theirTimes.set(message.round, message.time);
          settle();
          redraw();
        }
      }),
    [listenMoves, match, host, startRound, settle]
  );

  const settled = current.round >= 0 && current.winners.length > current.round;
  const now = performance.now();
  const counting = current.round >= 0 && !settled && now < current.shownAt;
  const racing = current.round >= 0 && !settled && !counting;

  // Ticks the countdown along, and gives up once the other's time can't be beaten
  useEffect(() => {
    if (current.round < 0 || settled || over) return undefined;
    const timer = setInterval(() => {
      const r = race.current;
      const elapsed = performance.now() - r.shownAt;
      if (elapsed >= 0 && r.myTime === undefined && cantWin(elapsed, r.theirTimes.get(r.round))) {
        finish(null);
      }
      redraw();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [current.round, settled, over, finish]);

  const onType = (event) => {
    const value = event.target.value;
    setTyped(value);
    const r = race.current;
    if (racing && r.myTime === undefined && typedIt(value, r.word)) {
      finish(performance.now() - r.shownAt);
    }
  };

  const theirTime = current.theirTimes.get(current.round);
  let status;
  if (over) status = wins > losses ? "You win the match!" : `${partnerName} wins the match.`;
  else if (current.round < 0) status = "Get ready…";
  else if (settled) {
    const winner = current.winners[current.round];
    status = winner === me ? "You got it first!" : `${partnerName} got it first.`;
  } else if (counting) status = `Round ${current.round + 1}`;
  else if (current.myTime !== undefined) status = `Waiting for ${partnerName}…`;
  else if (typeof theirTime === "number") status = `${partnerName} is done. Quick!`;
  else status = "Type it!";

  return (
    <>
      <Score>
        You {wins} – {losses} {partnerName} · first to {WINS_NEEDED}
      </Score>
      <Status aria-live="polite">{status}</Status>
      <Word aria-live="polite" $muted={!racing}>
        {counting ? Math.ceil((current.shownAt - now) / 1000) : current.word || "…"}
      </Word>
      {settled && current.lastTimes && (
        <Times>
          You {seconds(current.lastTimes.mine)} · {partnerName} {seconds(current.lastTimes.theirs)}
        </Times>
      )}
      {over ? (
        <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />
      ) : (
        <TypeBox
          ref={input}
          value={typed}
          onChange={onType}
          readOnly={!racing || current.myTime !== undefined}
          onPaste={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
          aria-label="Type the word here"
          placeholder={racing ? "Type it here" : "Wait for the word…"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
        />
      )}
    </>
  );
};

const Word = styled.p`
  margin: 0 0 14px;
  text-align: center;
  font: 600 clamp(40px, 9vw, 64px) / 1.1 ${pixel};
  color: ${({ $muted }) => ($muted ? inkSoft : ink)};
  user-select: none;
`;

const Times = styled.p`
  margin: 0 0 14px;
  text-align: center;
  color: ${inkSoft};
`;

const TypeBox = styled.input`
  display: block;
  width: min(100%, 360px);
  margin: 0 auto;
  padding: 12px 16px;
  border: 2px solid ${inkSoft};
  border-radius: 12px;
  color: ${ink};
  background: #fff;
  font: 600 22px / 1.2 ${pixel};
  text-align: center;

  &:focus {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
  }
`;

export default TypeRace;
