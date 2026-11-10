import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import ChromeFrame from "../../../UserInterface/ChromeFrame.jsx";
import { crimson, focusBlue, inkSoft } from "../../../UserInterface/Modal.jsx";
import {
  CELLS,
  SHIPS,
  SIZE,
  allSunk,
  answerShot,
  answersMatch,
  commitFleet,
  decodeFleet,
  encodeFleet,
  fleetCells,
  isCommitment,
  moveShip,
  newSalt,
  plausibleAnswer,
  randomFleet,
  shipsLeft,
  shooterOf,
  stepFocus,
  turnShip,
} from "./seaBattle.js";
import { AgainBar, GameButton, Score, Status } from "../../shared/gameParts.jsx";

// Answers and the fleet shown at the end have to get there, or the other player is left waiting,
// so any that don't go out are tried again this often until they do
const RETRY_MS = 1500;

const isCell = (cell) => Number.isInteger(cell) && cell >= 0 && cell < CELLS;

// Which ship covers each cell, and where along it the cell is, for drawing the ships joined up.
// ships is a list of each ship's cells, from its top or left end.
function shipMap(ships) {
  const map = Array(CELLS).fill(null);
  ships.forEach((cells, which) => {
    const down = cells.length > 1 && cells[1] - cells[0] === SIZE;
    cells.forEach((cell, at) => {
      map[cell] = { which, down, first: at === 0, end: at === cells.length - 1 };
    });
  });
  return map;
}

// Each places their fleet in secret and says when they're ready, with a commitment that pins the
// fleet down without giving it away. Then they take turns firing, and whoever is shot at says
// whether it hit, so neither fleet is ever sent until the game is over. At the end both show
// their fleets, and each checks the other's against the commitment and every answer it gave.
const SeaBattle = ({ host, partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  const me = host ? 0 : 1;
  const sea = useRef(null);
  // Set up once, rather than shuffling a fleet on every render only to throw it away
  if (!sea.current) {
    sea.current = {
      fleet: randomFleet(),
      salt: "",
      readying: false,
      myReady: false,
      theirReady: false,
      theirCommitment: "",
      // Every shot in order, { cell, result, sunk }. Shot k is fired by shooterOf(k, match), and
      // result is null until the answer comes back.
      shots: [],
      // Messages that have to arrive, in order, waiting to go out
      outbox: [],
      revealed: false,
      theirFleet: null,
      // Whether their fleet, once shown, matched what they'd said: null until it's checked
      honest: null,
      // Set when one of their answers couldn't be true, which ends the game
      broken: false,
    };
  }
  const [, redraw] = useReducer((n) => n + 1, 0);
  const [chosen, setChosen] = useState(null);
  const [focus, setFocus] = useState(0);
  const [note, setNote] = useState("");
  const alive = useRef(true);
  const placing = useRef(null);
  const target = useRef(null);
  const drag = useRef(null);

  const current = sea.current;
  const shotsBy = (player) => current.shots.filter((_, k) => shooterOf(k, match) === player);
  const answered = (shots) => shots.filter((shot) => shot.result !== null);
  const mine = answered(shotsBy(me));
  const theirs = answered(shotsBy(1 - me));
  const won = allSunk(mine);
  const lost = allSunk(theirs);
  const over = won || lost || current.broken;
  const firing = current.myReady && current.theirReady;
  const lastShot = current.shots[current.shots.length - 1];
  const waitingForAnswer = Boolean(lastShot) && lastShot.result === null;
  const myTurn =
    firing && !over && !waitingForAnswer && shooterOf(current.shots.length, match) === me;

  // Sends what's waiting in order, stopping at the first that doesn't go, so nothing overtakes
  const flush = useCallback(() => {
    const s = sea.current;
    while (s.outbox.length && sendMove("play", { data: s.outbox[0] })) s.outbox.shift();
  }, [sendMove]);

  const post = useCallback(
    (data) => {
      sea.current.outbox.push(data);
      flush();
    },
    [flush]
  );

  // Both show their fleet once it's over, whoever won
  const reveal = useCallback(() => {
    const s = sea.current;
    if (s.revealed) return;
    s.revealed = true;
    post({ t: "fleet", f: encodeFleet(s.fleet), k: s.salt });
  }, [post]);

  useEffect(() => {
    const timer = setInterval(flush, RETRY_MS);
    alive.current = true;
    return () => {
      clearInterval(timer);
      alive.current = false;
    };
  }, [flush]);

  useEffect(() => {
    placing.current?.querySelector('[data-cell="0"]')?.focus();
  }, []);

  useEffect(() => {
    if (over) reveal();
  }, [over, reveal]);

  // The placing grid goes once both are ready, so the focus moves over to their waters
  useEffect(() => {
    if (firing) target.current?.querySelector('[data-cell="0"]')?.focus();
  }, [firing]);

  const checkTheirFleet = useCallback(
    (fleet, salt) => {
      const s = sea.current;
      const shots = s.shots.filter((shot, k) => shooterOf(k, match) === me && shot.result);
      const consistent = answersMatch(fleet, shots);
      s.theirFleet = fleet;
      redraw();
      if (!s.theirCommitment) {
        s.honest = consistent;
        return;
      }
      commitFleet(fleet, salt).then((commitment) => {
        if (!alive.current) return;
        // A browser that can't hash can't check, so it goes on the answers alone
        s.honest = consistent && (commitment === "" || commitment === s.theirCommitment);
        redraw();
      });
    },
    [match, me]
  );

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const s = sea.current;
        const data = message.data;
        const shotsOf = (player) =>
          s.shots.filter((shot, k) => shooterOf(k, match) === player && shot.result !== null);
        const ended = () => s.broken || allSunk(shotsOf(0)) || allSunk(shotsOf(1));
        const pending = s.shots.length > 0 && s.shots[s.shots.length - 1].result === null;

        if (data.t === "ready") {
          if (s.theirReady || !isCommitment(data.c)) return;
          s.theirReady = true;
          s.theirCommitment = data.c;
          redraw();
          return;
        }

        if (data.t === "shot") {
          // Only the next shot counts, and only when it's theirs to fire
          if (!s.myReady || !s.theirReady || ended() || pending) return;
          if (data.n !== s.shots.length || shooterOf(data.n, match) === me) return;
          if (!isCell(data.x)) return;
          const earlier = s.shots
            .filter((_, k) => shooterOf(k, match) !== me)
            .map((shot) => shot.cell);
          if (earlier.includes(data.x)) return;
          const answer = answerShot(s.fleet, earlier, data.x);
          s.shots = [...s.shots, { cell: data.x, ...answer }];
          post({ t: "answer", n: data.n, r: answer.result, s: answer.sunk });
          redraw();
          return;
        }

        if (data.t === "answer") {
          if (!pending || data.n !== s.shots.length - 1 || shooterOf(data.n, match) !== me) return;
          const shot = s.shots[data.n];
          const sunk = Array.isArray(data.s) ? data.s : [];
          if (plausibleAnswer(shotsOf(me), shot.cell, data.r, sunk)) {
            s.shots = s.shots.map((each, k) =>
              k === data.n ? { ...each, result: data.r, sunk } : each
            );
          } else {
            s.broken = true;
          }
          redraw();
          return;
        }

        if (data.t === "fleet") {
          if (s.theirFleet || !ended() || typeof data.k !== "string") return;
          const fleet = decodeFleet(data.f);
          if (!fleet) {
            s.honest = false;
            redraw();
            return;
          }
          checkTheirFleet(fleet, data.k);
        }
      }),
    [listenMoves, match, me, post, checkTheirFleet]
  );

  // Placing the fleet

  const map = shipMap(fleetCells(current.fleet));

  const setFleet = (fleet) => {
    if (!fleet) {
      setNote("No room there.");
      return false;
    }
    sea.current.fleet = fleet;
    setNote("");
    redraw();
    return true;
  };

  const turnChosen = () => {
    if (chosen === null) return;
    if (setFleet(turnShip(current.fleet, chosen)) === false) setNote("No room to turn it.");
  };

  const tapPlacing = (cell) => {
    if (current.myReady || current.readying) return;
    const here = map[cell];
    if (chosen === null) {
      if (here) setChosen(here.which);
      return;
    }
    // Tapping the chosen ship again turns it, and tapping water moves it there
    if (here?.which === chosen) turnChosen();
    else if (here) setChosen(here.which);
    else if (setFleet(moveShip(current.fleet, chosen, cell))) setChosen(null);
  };

  const shuffle = () => {
    setChosen(null);
    setFleet(randomFleet());
  };

  const ready = async () => {
    const s = sea.current;
    if (s.myReady || s.readying) return;
    s.readying = true;
    setChosen(null);
    redraw();
    s.salt = newSalt();
    const commitment = await commitFleet(s.fleet, s.salt);
    if (!alive.current) return;
    s.readying = false;
    if (sendMove("play", { data: { t: "ready", c: commitment } })) {
      s.myReady = true;
      setNote("");
      setFocus(0);
    } else {
      setNote("That didn't go through. Try again.");
    }
    redraw();
  };

  // A ship can be dragged too. It keeps hold of the cell it was picked up by, so it lands where
  // it was let go rather than jumping its end to the pointer.
  const onPointerDown = (event, cell) => {
    const here = map[cell];
    if (!here || current.myReady || current.readying) return;
    const start = current.fleet[here.which].start;
    const offset = here.down ? (cell - start) / SIZE : cell - start;
    drag.current = { which: here.which, from: cell, offset };
  };

  const onPointerUp = (event) => {
    const held = drag.current;
    drag.current = null;
    if (!held) return;
    const under = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-cell]");
    const cell = under && placing.current?.contains(under) ? Number(under.dataset.cell) : null;
    // Let go where it was picked up, it's a tap, and the click handles that
    if (cell === null || cell === held.from) return;
    const down = current.fleet[held.which].down;
    const column = Math.max(0, (cell % SIZE) - (down ? 0 : held.offset));
    const row = Math.max(0, Math.floor(cell / SIZE) - (down ? held.offset : 0));
    if (setFleet(moveShip(current.fleet, held.which, row * SIZE + column))) setChosen(null);
  };

  // Firing

  const fire = (cell) => {
    const s = sea.current;
    if (!myTurn) return;
    if (s.outbox.length) {
      setNote("Still sending your last answer…");
      return;
    }
    if (mine.some((shot) => shot.cell === cell)) return;
    const n = s.shots.length;
    if (!sendMove("play", { data: { t: "shot", n, x: cell } })) {
      setNote("That didn't go through. Try again.");
      return;
    }
    setNote("");
    s.shots = [...s.shots, { cell, result: null, sunk: [] }];
    redraw();
  };

  // The arrow keys move round whichever grid has the focus. On the placing grid Enter or Space
  // picks up a ship or puts it down, and R turns it.
  const onGridKeyDown = (event, grid) => {
    if (grid === placing && event.key.toLowerCase() === "r" && chosen !== null) {
      event.preventDefault();
      turnChosen();
      return;
    }
    const next = stepFocus(focus, event.key);
    if (next === null) return;
    event.preventDefault();
    setFocus(next);
    grid.current?.querySelector(`[data-cell="${next}"]`)?.focus();
  };

  // What to show on each of their cells: what my shots found, and their ships once shown
  const targetView = Array(CELLS).fill("sea");
  mine.forEach((shot) => {
    targetView[shot.cell] = shot.result;
  });
  mine.forEach((shot) => {
    shot.sunk.forEach((cell) => {
      targetView[cell] = "sunk";
    });
  });
  // Their ships as far as is known: the ones sunk so far, then the whole fleet once it's shown
  const theirMap = shipMap(
    current.theirFleet
      ? fleetCells(current.theirFleet)
      : mine.filter((shot) => shot.sunk.length).map((shot) => [...shot.sunk].sort((a, b) => a - b))
  );
  const pendingCell = waitingForAnswer ? lastShot.cell : null;

  const shotAtMe = new Map(theirs.map((shot) => [shot.cell, shot.result]));
  const mySunk = new Set(theirs.flatMap((shot) => shot.sunk));

  const lastAnswered = [...current.shots].reverse().find((shot) => shot.result !== null);
  const lastIndex = lastAnswered ? current.shots.lastIndexOf(lastAnswered) : -1;
  let event = "";
  if (lastAnswered) {
    const byMe = shooterOf(lastIndex, match) === me;
    if (lastAnswered.result === "miss") event = byMe ? "Miss." : `${partnerName} missed.`;
    else if (lastAnswered.result === "hit") event = byMe ? "Hit!" : `${partnerName} hit you!`;
    else if (byMe) event = `You sank their ${lastAnswered.sunk.length}!`;
    else event = `${partnerName} sank your ${lastAnswered.sunk.length}.`;
  }

  let status;
  if (current.broken) status = `${partnerName}'s answers didn't add up, so the game's off.`;
  else if (won) status = "You sank their whole fleet. You win!";
  else if (lost) status = `${partnerName} sank your whole fleet.`;
  else if (!current.myReady) {
    status = current.readying ? "Getting ready…" : "Place your ships.";
  } else if (!current.theirReady) status = `Waiting for ${partnerName} to place their ships…`;
  else if (myTurn) status = `${event} Your shot. Pick a square.`.trim();
  else if (pendingCell !== null) status = "Firing…";
  else status = `${event} ${partnerName} is aiming…`.trim();

  let check = "";
  if (over && current.honest === false) {
    check = `${partnerName}'s fleet doesn't match what they said.`;
  } else if (over && current.honest) {
    check = "Their fleet is shown, and it all checks out.";
  } else if (over && !current.theirFleet) {
    check = `Waiting for ${partnerName} to show their fleet…`;
  }

  const placingHelp =
    chosen === null
      ? "Tap a ship to pick it up, or drag it. Shuffle scatters them."
      : `Tap water to move the ${SHIPS[chosen]}, or tap it again to turn it (R).`;

  const cellLabel = (cell) => `${"abcdefgh"[cell % SIZE]}${Math.floor(cell / SIZE) + 1}`;

  if (!firing) {
    return (
      <>
        {current.theirReady && !current.myReady && <Score>{partnerName} is ready.</Score>}
        <Status aria-live="polite">{status}</Status>
        {!current.myReady && <Help>{placingHelp}</Help>}
        {note && <Note role="alert">{note}</Note>}
        <Grid
          ref={placing}
          role="group"
          aria-label="Your fleet"
          $size="min(100%, 340px)"
          $drag={!current.myReady}
          onKeyDown={(event) => onGridKeyDown(event, placing)}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          {map.map((ship, cell) => (
            <Cell
              key={cell}
              type="button"
              data-cell={cell}
              tabIndex={cell === focus ? 0 : -1}
              $active={!current.myReady}
              aria-disabled={current.myReady}
              aria-pressed={ship ? ship.which === chosen : undefined}
              aria-label={`${cellLabel(cell)}, ${ship ? `ship of ${SHIPS[ship.which]}` : "water"}`}
              onFocus={() => setFocus(cell)}
              onClick={() => tapPlacing(cell)}
              onPointerDown={(event) => onPointerDown(event, cell)}
            >
              {ship && <Ship $ship={ship} $chosen={ship.which === chosen} aria-hidden="true" />}
            </Cell>
          ))}
        </Grid>
        {!current.myReady && (
          <Controls>
            <GameButton type="button" onClick={shuffle} disabled={current.readying}>
              Shuffle
              <ChromeFrame spikes={false} />
            </GameButton>
            <GameButton
              type="button"
              onClick={turnChosen}
              disabled={chosen === null || current.readying}
            >
              Turn
              <ChromeFrame spikes={false} />
            </GameButton>
            <GameButton type="button" onClick={ready} disabled={current.readying}>
              Ready
              <ChromeFrame spikes={false} />
            </GameButton>
          </Controls>
        )}
      </>
    );
  }

  return (
    <>
      <Score>
        Ships left: you {shipsLeft(theirs).length} · {partnerName} {shipsLeft(mine).length}
      </Score>
      <Status aria-live="polite">{status}</Status>
      {note && <Note role="alert">{note}</Note>}
      {check && <Help>{check}</Help>}
      <Waters>
        <Side>
          <Label>Their waters</Label>
          <Grid
            ref={target}
            role="group"
            aria-label="Their waters"
            $size="min(100%, 300px)"
            onKeyDown={(event) => onGridKeyDown(event, target)}
          >
            {targetView.map((view, cell) => {
              const open = myTurn && view === "sea";
              const ship = theirMap[cell];
              return (
                <Cell
                  key={cell}
                  type="button"
                  data-cell={cell}
                  tabIndex={cell === focus ? 0 : -1}
                  $active={open}
                  aria-disabled={!open}
                  aria-label={`${cellLabel(cell)}, ${view === "sea" ? "not tried" : view}`}
                  onFocus={() => setFocus(cell)}
                  onClick={() => fire(cell)}
                >
                  {ship && (
                    <Ship
                      $ship={ship}
                      $sunk={view === "sunk"}
                      $ghost={view !== "sunk"}
                      aria-hidden="true"
                    />
                  )}
                  {cell === pendingCell && <Mark $kind="aim" aria-hidden="true" />}
                  {view === "miss" && <Mark $kind="miss" aria-hidden="true" />}
                  {(view === "hit" || view === "sunk") && <Mark $kind="hit" aria-hidden="true" />}
                </Cell>
              );
            })}
          </Grid>
        </Side>
        <Side>
          <Label>Your fleet</Label>
          <Grid aria-label="Your fleet" role="img" $size="min(100%, 200px)" $small>
            {map.map((ship, cell) => (
              <Cell as="span" key={cell}>
                {ship && <Ship $ship={ship} $sunk={mySunk.has(cell)} />}
                {shotAtMe.get(cell) === "miss" && <Mark $kind="miss" />}
                {shotAtMe.has(cell) && shotAtMe.get(cell) !== "miss" && <Mark $kind="hit" />}
              </Cell>
            ))}
          </Grid>
        </Side>
      </Waters>
      {over && <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />}
    </>
  );
};

const Help = styled.p`
  margin: -8px 0 14px;
  text-align: center;
  color: ${inkSoft};
`;

const Note = styled.p`
  margin: -6px 0 12px;
  text-align: center;
  color: ${crimson};
  font-weight: 700;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
`;

const Waters = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 14px 20px;
`;

const Side = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 0 1 auto;
`;

const Label = styled.span`
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${inkSoft};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${SIZE}, 1fr);
  gap: ${({ $small }) => ($small ? "1px" : "2px")};
  width: ${({ $size }) => $size};
  min-width: ${({ $small }) => ($small ? "160px" : "240px")};
  padding: ${({ $small }) => ($small ? "4px" : "6px")};
  border-radius: 10px;
  background: #154a7a;
  /* While placing, a drag shouldn't scroll the page instead of moving the ship */
  touch-action: ${({ $drag }) => ($drag ? "none" : "manipulation")};
  user-select: none;
`;

const Cell = styled.button`
  position: relative;
  display: block;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: #2a74b3;
  cursor: ${({ $active }) => ($active ? "pointer" : "default")};

  &:hover {
    background: ${({ $active }) => ($active ? "#4b93d0" : "#2a74b3")};
  }

  &:focus-visible {
    outline: 3px solid #fff;
    outline-offset: -1px;
    z-index: 2;
  }
`;

// Ships are drawn cell by cell, with the rounded ends only at the ends, so they look joined up
const Ship = styled.span`
  position: absolute;
  inset: 0;
  border-radius: ${({ $ship }) => {
    const start = $ship.first ? "40%" : "0";
    const end = $ship.end ? "40%" : "0";
    // Corners go top left, top right, bottom right, bottom left
    return $ship.down ? `${start} ${start} ${end} ${end}` : `${start} ${end} ${end} ${start}`;
  }};
  background: ${({ $sunk, $ghost }) =>
    $sunk ? "#5b1027" : $ghost ? "rgba(214, 222, 232, 0.45)" : "#c9d2de"};
  box-shadow: ${({ $chosen }) =>
    $chosen ? `inset 0 0 0 3px ${focusBlue}` : "inset 0 -2px 0 rgba(0, 0, 0, 0.2)"};
`;

const splash = keyframes`
  from {
    transform: scale(0.2);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

const pulse = keyframes`
  from {
    opacity: 0.3;
  }
  to {
    opacity: 1;
  }
`;

const marks = {
  miss: css`
    inset: 36%;
    background: rgba(255, 255, 255, 0.8);
  `,
  hit: css`
    inset: 22%;
    background: ${crimson};
    box-shadow: 0 0 0 2px #ffb347;
  `,
  aim: css`
    inset: 18%;
    border: 2px solid #fff;
    animation: ${pulse} 0.6s ease-in-out infinite alternate;
  `,
};

const Mark = styled.span`
  position: absolute;
  z-index: 1;
  border-radius: 50%;
  animation: ${splash} 0.25s ease-out;
  ${({ $kind }) => marks[$kind]}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export default SeaBattle;
