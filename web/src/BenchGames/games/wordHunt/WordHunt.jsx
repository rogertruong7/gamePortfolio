import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import ChromeFrame from "../../../UserInterface/ChromeFrame.jsx";
import { crimson, focusBlue, ink, inkSoft, pixel } from "../../../UserInterface/Modal.jsx";
import { loadWords } from "../../shared/dictionary.js";
import { newSeed } from "../../shared/random.js";
import { AgainBar, GameButton, Score, Status } from "../../shared/gameParts.jsx";
import {
  MIN_LETTERS,
  SIZE,
  makeBoard,
  pathWord,
  readResultPart,
  joinParts,
  resultParts,
  roundWinner,
  scoreWords,
  sortWords,
  touching,
  tracePath,
  wordPoints,
} from "./wordHunt.js";

const COUNTDOWN_MS = 3000;
const TICK_MS = 200;
const NOTE_MS = 1600;
// Setup messages and the final words go again every so often until the other answers, in case
// one went missing. Never more than a few, to stay well inside the rate limit.
const RESEND_MS = 3000;
const RESENDS = 4;

const isSeed = (value) => Number.isInteger(value) && value >= 0 && value <= 1e6;

const clock = (ms) => {
  const left = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
};

function keepSending(later, send, answered, left = RESENDS) {
  if (answered()) return;
  send();
  if (left > 0) later(RESEND_MS, () => keepSending(later, send, answered, left - 1));
}

// A timed round of finding words that Word Hunt and Anagrams both use. The one who sent the invite
// picks a seed and sends it, and both build the same puzzle from it once the word list is in. The
// other says it's ready, the inviter says go, and both get the same time on their own clock. When
// it runs out each sends the words they found, and both work out the winner from the two scores.
// - load() fetches what build and check need, and build(seed, loaded) makes the puzzle
// - check(word, puzzle, loaded) says why a word doesn't count, or null if it does
// - Board ({ puzzle, playing, hidden, submit }) is where the words are made. submit(word) says
//   whether it counted.
// - about(puzzle) is a line for the end, like how many words there were
export const WordRound = ({
  host,
  partnerName,
  match,
  again,
  sendMove,
  listenMoves,
  onAgain,
  seconds,
  load,
  build,
  check,
  Board,
  about,
}) => {
  const round = useRef({
    alive: true,
    seed: null,
    loaded: null,
    failed: false,
    theyFailed: false,
    offline: false,
    puzzle: null,
    theyReady: false,
    startAt: null,
    endAt: null,
    timeUp: false,
    found: [],
    delivered: false,
    // Their words as they come in, by part, and all of them once every part is in
    parts: new Map(),
    theirs: null,
    timers: new Set(),
  });
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [note, setNote] = useState(null);
  const noteCount = useRef(0);

  const later = useCallback((ms, run) => {
    const timers = round.current.timers;
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  }, []);

  const play = useCallback(
    (step, fields = {}) => {
      const sent = sendMove("play", { data: { step, ...fields } });
      round.current.offline = !sent;
      return sent;
    },
    [sendMove]
  );

  const showNote = useCallback(
    (text, good) => {
      noteCount.current += 1;
      const key = noteCount.current;
      setNote({ text, good, key });
      later(NOTE_MS, () => setNote((current) => (current?.key === key ? null : current)));
    },
    [later]
  );

  const finish = useCallback(() => {
    const r = round.current;
    if (r.timeUp || r.startAt === null) return;
    r.timeUp = true;
    const words = r.found;
    const score = scoreWords(words);
    const parts = resultParts(words);
    keepSending(
      later,
      () =>
        parts.forEach((list, part) =>
          play("done", { score, total: words.length, part, parts: parts.length, words: list })
        ),
      () => r.delivered
    );
    redraw();
  }, [later, play]);

  const start = useCallback(() => {
    const r = round.current;
    if (r.startAt !== null) return;
    r.startAt = performance.now() + COUNTDOWN_MS;
    r.endAt = r.startAt + seconds * 1000;
    later(COUNTDOWN_MS + seconds * 1000, finish);
    redraw();
  }, [seconds, later, finish]);

  const tryBuild = useCallback(() => {
    const r = round.current;
    if (r.puzzle || r.seed === null || !r.loaded) return;
    r.puzzle = build(r.seed, r.loaded);
    if (host) {
      if (r.theyReady) {
        start();
        play("go");
      }
    } else {
      keepSending(
        later,
        () => play("ready"),
        () => r.startAt !== null
      );
    }
    redraw();
  }, [build, host, start, play, later]);

  const fetchWords = useCallback(() => {
    const r = round.current;
    r.failed = false;
    redraw();
    load().then(
      (loaded) => {
        if (!r.alive) return;
        r.loaded = loaded;
        tryBuild();
        redraw();
      },
      () => {
        if (!r.alive) return;
        r.failed = true;
        play("fail");
        redraw();
      }
    );
  }, [load, tryBuild, play]);

  useEffect(() => {
    const r = round.current;
    r.alive = true;
    if (host) {
      // Kept if it's already been picked, so a remount sends the same one again
      if (r.seed === null) r.seed = newSeed();
      keepSending(
        later,
        () => play("seed", { seed: r.seed }),
        () => r.theyReady
      );
    }
    fetchWords();
    return () => {
      r.alive = false;
      r.timers.forEach(clearTimeout);
      r.timers.clear();
    };
  }, [host, later, play, fetchWords]);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        if (message.kind !== "play") return;
        const r = round.current;
        const data = message.data;
        r.theyFailed = data.step === "fail";

        if (data.step === "seed") {
          if (!host && r.seed === null && isSeed(data.seed)) {
            r.seed = data.seed;
            tryBuild();
          }
        } else if (data.step === "ready") {
          if (!host) return;
          r.theyReady = true;
          // Started already means the go went missing, so it goes again
          if (r.startAt !== null) play("go");
          else if (r.puzzle) {
            start();
            play("go");
          }
        } else if (data.step === "go") {
          if (!host && r.puzzle) start();
        } else if (data.step === "done") {
          const part = readResultPart(data);
          if (!part) return;
          if (r.theirs) {
            // They're sending again, so the last "got" didn't reach them
            if (part.part === 0) play("got");
            return;
          }
          const first = r.parts.get(0) ?? [...r.parts.values()][0];
          if (first && first.parts !== part.parts) return;
          if (!r.parts.has(part.part)) r.parts.set(part.part, part);
          r.theirs = joinParts(r.parts);
          if (r.theirs) play("got");
        } else if (data.step === "got") {
          r.delivered = true;
        }
        redraw();
      }),
    [listenMoves, match, host, tryBuild, start, play]
  );

  const r = round.current;
  const now = performance.now();
  const started = r.startAt !== null;
  const counting = started && now < r.startAt;
  const playing = started && !counting && !r.timeUp;
  const over = r.timeUp && Boolean(r.theirs);

  // Ticks the clock down. Also ends the round if the timer above was held up, as happens in a
  // tab that's in the background.
  useEffect(() => {
    if (!started || r.timeUp) return undefined;
    const timer = setInterval(() => {
      if (performance.now() >= round.current.endAt) finish();
      redraw();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [started, r.timeUp, finish]);

  const submit = useCallback(
    (raw) => {
      const current = round.current;
      const word = raw.trim().toLowerCase();
      const at = performance.now();
      if (current.startAt === null || at < current.startAt || current.timeUp) return false;
      if (at >= current.endAt) {
        finish();
        return false;
      }
      let why = null;
      if (word.length < MIN_LETTERS) why = `Words need ${MIN_LETTERS} letters or more`;
      else if (current.found.includes(word)) why = "Already found";
      else why = check(word, current.puzzle, current.loaded);
      if (why) {
        showNote(why, false);
        return false;
      }
      current.found = [...current.found, word];
      showNote(`${word.toUpperCase()} +${wordPoints(word)}`, true);
      redraw();
      return true;
    },
    [check, finish, showNote]
  );

  const myScore = scoreWords(r.found);
  const theirScore = r.theirs?.score ?? 0;
  const result = over
    ? roundWinner(host ? myScore : theirScore, host ? theirScore : myScore)
    : null;
  const me = host ? "host" : "guest";

  let status;
  if (over) {
    status =
      result === "draw" ? "It's a draw!" : result === me ? "You win!" : `${partnerName} wins.`;
  } else if (r.failed) status = "Couldn't load the word list.";
  else if (r.offline && !playing) status = `Couldn't reach ${partnerName}. Trying again…`;
  else if (!r.loaded) status = "Getting the words ready…";
  else if (r.theyFailed) status = `${partnerName} couldn't load the word list.`;
  else if (!started) status = `Waiting for ${partnerName}…`;
  else if (counting) status = `Get ready… ${Math.ceil((r.startAt - now) / 1000)}`;
  else if (playing) status = "Find words!";
  else status = `Time's up! Waiting for ${partnerName}'s words…`;

  return (
    <>
      <Score>
        {started && !over ? `${clock(Math.min(r.endAt - now, seconds * 1000))} · ` : ""}
        {over ? `You ${myScore} – ${theirScore} ${partnerName}` : `${myScore} points`}
      </Score>
      <Status aria-live="polite">{status}</Status>
      {r.failed && (
        <Centre>
          <GameButton type="button" onClick={fetchWords}>
            Try again
            <ChromeFrame spikes={false} />
          </GameButton>
        </Centre>
      )}
      {r.puzzle && !over && (
        <>
          <Board
            puzzle={r.puzzle}
            playing={playing}
            hidden={!started || counting}
            submit={submit}
          />
          <Note aria-live="polite" $good={note?.good}>
            {note && <NoteText key={note.key}>{note.text}</NoteText>}
          </Note>
          {r.found.length > 0 && (
            <Found aria-label="Words you've found">
              {[...r.found].reverse().map((word) => (
                <Chip key={word}>{word}</Chip>
              ))}
            </Found>
          )}
        </>
      )}
      {over && (
        <>
          <Results>
            <WordList
              title={`You · ${myScore}`}
              words={r.found}
              shared={r.theirs.words}
              total={r.found.length}
            />
            <WordList
              title={`${partnerName} · ${theirScore}`}
              words={r.theirs.words}
              shared={r.found}
              total={r.theirs.total}
            />
          </Results>
          <About>{about(r.puzzle)} Greyed out words were found by you both.</About>
          <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />
        </>
      )}
    </>
  );
};

// One player's words at the end, longest first. total can be more than were sent, if they found a
// great many.
const WordList = ({ title, words, shared, total }) => (
  <ListBox>
    <ListTitle>{title}</ListTitle>
    {words.length ? (
      <Words tabIndex={0} aria-label={title}>
        {sortWords(words).map((word) => (
          <WordRow key={word} $shared={shared.includes(word)}>
            <span>{word}</span>
            <span>{wordPoints(word)}</span>
          </WordRow>
        ))}
        {total > words.length && <WordRow>and {total - words.length} more</WordRow>}
      </Words>
    ) : (
      <Empty>No words</Empty>
    )}
  </ListBox>
);

const huntLoad = loadWords;
const huntBuild = (seed, words) => makeBoard(seed, words);
const huntCheck = (word, puzzle, words) => {
  if (!words.has(word)) return "Not in the word list";
  if (!tracePath(puzzle.grid, word)) return "Not on the board";
  return null;
};
const huntAbout = (puzzle) => `There were ${puzzle.total} words hidden in this grid.`;

const tileText = (tile) => tile.charAt(0).toUpperCase() + tile.slice(1);

// How close to a tile's middle the finger has to come to pick it, as a share of its width. Under
// half, so cutting a corner on a diagonal doesn't pick up the tiles either side.
const HIT = 0.42;

// Drag across touching tiles to spell a word, and let go to try it. Going back onto the tile
// before takes the last one off. Typing works too, and lights up the tiles it spells.
const HuntBoard = ({ puzzle, playing, hidden, submit }) => {
  const { grid } = puzzle;
  const [trail, setTrail] = useState([]);
  const [typed, setTyped] = useState("");
  const trailRef = useRef([]);
  const drag = useRef(null);
  const tiles = useRef([]);
  const input = useRef(null);

  const moveTrail = (next) => {
    trailRef.current = next;
    setTrail(next);
  };

  // The keyboard pops up over the grid on phones, so it's only focused with a mouse about
  useEffect(() => {
    if (playing && window.matchMedia?.("(pointer: fine)").matches) input.current?.focus();
    if (!playing) {
      drag.current = null;
      trailRef.current = [];
      setTrail([]);
    }
  }, [playing]);

  const tileAt = (x, y) =>
    tiles.current.findIndex((tile) => {
      if (!tile) return false;
      const box = tile.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2);
      const dy = y - (box.top + box.height / 2);
      return Math.hypot(dx, dy) <= box.width * HIT;
    });

  const visit = (i) => {
    const path = trailRef.current;
    const last = path[path.length - 1];
    if (i < 0 || i === last) return;
    if (i === path[path.length - 2]) moveTrail(path.slice(0, -1));
    else if (!path.includes(i) && touching(last, i)) moveTrail([...path, i]);
  };

  const onPointerDown = (event) => {
    if (!playing || drag.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const i = tileAt(event.clientX, event.clientY);
    if (i < 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setTyped("");
    moveTrail([i]);
  };

  // A quick swipe can jump right over a tile between two move events, so the points in between
  // are checked as well
  const onPointerMove = (event) => {
    const from = drag.current;
    if (!from || event.pointerId !== from.id) return;
    const width = tiles.current[0]?.getBoundingClientRect().width || 60;
    const distance = Math.hypot(event.clientX - from.x, event.clientY - from.y);
    const steps = Math.max(1, Math.ceil(distance / (width / 4)));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      visit(tileAt(from.x + (event.clientX - from.x) * t, from.y + (event.clientY - from.y) * t));
    }
    drag.current = { ...from, x: event.clientX, y: event.clientY };
  };

  const onPointerEnd = (event) => {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    drag.current = null;
    const path = trailRef.current;
    moveTrail([]);
    if (event.type === "pointerup" && path.length > 1) submit(pathWord(grid, path));
  };

  const onType = (event) => {
    setTyped(
      event.target.value
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .slice(0, 16)
    );
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!typed) return;
    submit(typed);
    setTyped("");
  };

  const lit = trail.length ? trail : (typed && tracePath(grid, typed)) || [];
  const spelling = trail.length ? pathWord(grid, trail) : "";
  const points = lit.map((i) => `${(i % SIZE) + 0.5},${Math.floor(i / SIZE) + 0.5}`).join(" ");
  const label = hidden
    ? "Letter grid, hidden until the round starts"
    : `Letter grid. ${Array.from(
        { length: SIZE },
        (_, row) =>
          `Row ${row + 1}: ${grid
            .slice(row * SIZE, row * SIZE + SIZE)
            .map(tileText)
            .join(" ")}`
      ).join(". ")}`;

  return (
    <>
      <Spelling aria-hidden="true">{spelling.toUpperCase() || " "}</Spelling>
      <Frame>
        <Tiles
          role="img"
          aria-label={label}
          $playing={playing}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
        >
          {grid.map((tile, i) => (
            <Cell key={i}>
              <Tile
                ref={(node) => {
                  tiles.current[i] = node;
                }}
                $on={!hidden && lit.includes(i)}
                $dim={!playing && !hidden}
              >
                {hidden ? "" : tileText(tile)}
              </Tile>
            </Cell>
          ))}
          {lit.length > 1 && !hidden && (
            <Trail viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
              <polyline points={points} />
            </Trail>
          )}
        </Tiles>
      </Frame>
      <TypeForm onSubmit={onSubmit}>
        <TypeBox
          ref={input}
          value={typed}
          onChange={onType}
          readOnly={!playing}
          aria-label="Or type a word here"
          placeholder={playing ? "Or type a word" : "Wait for the letters…"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
        />
        <GameButton type="submit" disabled={!playing || !typed}>
          Enter
          <ChromeFrame spikes={false} />
        </GameButton>
      </TypeForm>
    </>
  );
};

// Swipe across touching letters to make words before the time runs out
const WordHunt = (props) => (
  <WordRound
    {...props}
    seconds={80}
    load={huntLoad}
    build={huntBuild}
    check={huntCheck}
    Board={HuntBoard}
    about={huntAbout}
  />
);

const Centre = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
`;

const pop = keyframes`
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: none;
  }
`;

const Note = styled.p`
  min-height: 1.4em;
  margin: 10px 0 6px;
  text-align: center;
  font: 600 18px / 1.3 ${pixel};
  font-variant-ligatures: none;
  color: ${({ $good }) => ($good ? "#1d7a3a" : crimson)};
`;

const NoteText = styled.span`
  display: inline-block;
  animation: ${pop} 180ms ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Found = styled.ul`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  max-height: 76px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
`;

const Chip = styled.li`
  padding: 2px 10px;
  border-radius: 999px;
  color: ${ink};
  background: #e6ebf3;
  font-size: 15px;
`;

const Results = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
`;

const ListBox = styled.div`
  min-width: 0;
`;

const ListTitle = styled.p`
  margin: 0 0 6px;
  text-align: center;
  font: 600 18px / 1.2 ${pixel};
  font-variant-ligatures: none;
  color: ${ink};
  overflow-wrap: anywhere;
`;

const Words = styled.ul`
  max-height: 210px;
  margin: 0;
  padding: 6px 10px;
  overflow-y: auto;
  border-radius: 12px;
  background: #eef2f8;
  list-style: none;

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
  }
`;

const WordRow = styled.li`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  color: ${({ $shared }) => ($shared ? inkSoft : ink)};
  opacity: ${({ $shared }) => ($shared ? 0.6 : 1)};
  font-size: 15px;
`;

const Empty = styled.p`
  margin: 0;
  text-align: center;
  color: ${inkSoft};
`;

const About = styled.p`
  margin: 12px 0 0;
  text-align: center;
  color: ${inkSoft};
  font-size: 15px;
`;

const Spelling = styled.p`
  min-height: 1.2em;
  margin: 0 0 8px;
  text-align: center;
  font: 600 26px / 1.2 ${pixel};
  font-variant-ligatures: none;
  letter-spacing: 0.08em;
  color: ${ink};
`;

const Frame = styled.div`
  box-sizing: border-box;
  width: min(100%, 340px);
  margin: 0 auto;
  padding: 6px;
  border-radius: 18px;
  background: linear-gradient(#c6d0e1, #a9b6cd);
  box-shadow: inset 0 2px 4px rgba(20, 35, 90, 0.25);
`;

// touch-action none so a drag across the letters doesn't scroll the modal
const Tiles = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: ${({ $playing }) => ($playing ? "pointer" : "default")};
`;

const Cell = styled.div`
  padding: 4px;
`;

const Tile = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 12px;
  font: 600 clamp(24px, 8vw, 36px) / 1 ${pixel};
  font-variant-ligatures: none;
  color: ${({ $on }) => ($on ? "#fff" : ink)};
  background: ${({ $on }) =>
    $on ? `linear-gradient(${focusBlue}, #1764ab)` : "linear-gradient(#fff, #e3e8f0)"};
  box-shadow:
    inset 0 -3px 0 rgba(20, 35, 90, 0.18),
    0 1px 2px rgba(0, 0, 0, 0.25);
  opacity: ${({ $dim }) => ($dim ? 0.6 : 1)};
  transform: ${({ $on }) => ($on ? "scale(0.94)" : "none")};
  transition:
    transform 90ms ease-out,
    background 90ms;

  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition: none;
  }
`;

const Trail = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  polyline {
    fill: none;
    stroke: ${focusBlue};
    stroke-width: 0.16;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.45;
  }
`;

const TypeForm = styled.form`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
`;

const TypeBox = styled.input`
  min-width: 0;
  width: 220px;
  padding: 10px 14px;
  border: 2px solid ${inkSoft};
  border-radius: 12px;
  color: ${ink};
  background: #fff;
  font: 600 20px / 1.2 ${pixel};
  text-align: center;
  text-transform: uppercase;

  &::placeholder {
    text-transform: none;
  }

  &:focus {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
  }
`;

export default WordHunt;
