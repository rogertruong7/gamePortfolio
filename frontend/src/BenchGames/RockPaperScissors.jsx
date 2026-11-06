import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import ChromeFrame from "../UserInterface/ChromeFrame.jsx";
import { inkSoft } from "../UserInterface/Modal.jsx";
import { THROWS } from "./protocol.js";
import { WINS_NEEDED, compare, matchOver, tally } from "./rps.js";
import { AgainBar, GameButton, Score, Status } from "./gameParts.jsx";

const HANDS = { scissors: "✌️", paper: "✋", rock: "✊" };
const LABELS = { scissors: "Scissors", paper: "Paper", rock: "Rock" };

// Each picks without seeing the other's pick. Theirs arrives first more often than not, but it
// stays hidden until this player has picked too.
const RockPaperScissors = ({ partnerName, match, again, sendMove, listenMoves, onAgain }) => {
  // Every finished round's two picks, and this round's picks so far
  const [rounds, setRounds] = useState([]);
  const [mine, setMine] = useState(null);
  const [theirs, setTheirs] = useState(null);
  const state = useRef({ rounds: [], mine: null, theirs: new Map() });
  const firstButton = useRef(null);

  const settle = () => {
    const current = state.current;
    const round = current.rounds.length;
    const them = current.theirs.get(round);
    setTheirs(them ?? null);
    if (!current.mine || !them) return;
    current.rounds = [...current.rounds, { me: current.mine, them }];
    current.theirs.delete(round);
    current.mine = null;
    setRounds(current.rounds);
    setMine(null);
    setTheirs(null);
  };
  const settleRef = useRef(settle);
  settleRef.current = settle;

  useEffect(() => {
    firstButton.current?.focus();
  }, []);

  useEffect(
    () =>
      listenMoves(match, (message) => {
        const current = state.current;
        if (message.kind !== "throw" || message.round < current.rounds.length) return;
        if (matchOver(tally(current.rounds))) return;
        if (!current.theirs.has(message.round)) current.theirs.set(message.round, message.pick);
        settleRef.current();
      }),
    [listenMoves, match]
  );

  const score = tally(rounds);
  const over = matchOver(score);

  const pick = (hand) => {
    const current = state.current;
    if (over || current.mine) return;
    current.mine = hand;
    setMine(hand);
    sendMove("throw", { round: current.rounds.length, pick: hand });
    settle();
  };

  const last = rounds[rounds.length - 1];
  const lastResult = last ? compare(last.me, last.them) : null;
  const status = over
    ? score[0] > score[1]
      ? "You win the match!"
      : `${partnerName} wins the match.`
    : mine
      ? `Waiting for ${partnerName}…`
      : theirs
        ? `${partnerName} has picked. Your go!`
        : "Pick one.";

  return (
    <>
      <Score>
        You {score[0]} – {score[1]} {partnerName} · first to {WINS_NEEDED}
      </Score>
      <Status>{status}</Status>
      {last && (
        // Keyed by round so it pops in again each time, and two draws in a row don't look like
        // nothing happened
        <Reveal key={rounds.length} aria-live="polite">
          <Hand title={LABELS[last.me]}>{HANDS[last.me]}</Hand>
          <Verdict>
            <RoundLabel>Round {rounds.length}</RoundLabel>
            {lastResult === 1 ? "You take it" : lastResult === -1 ? "They take it" : "Draw"}
          </Verdict>
          <Hand $flip title={LABELS[last.them]}>
            {HANDS[last.them]}
          </Hand>
        </Reveal>
      )}
      {!over && (
        <Choices>
          {THROWS.map((hand, i) => (
            <GameButton
              key={hand}
              ref={i === 0 ? firstButton : undefined}
              type="button"
              onClick={() => pick(hand)}
              disabled={Boolean(mine)}
              style={mine === hand ? { opacity: 1, outline: "3px solid #1F7FD6" } : undefined}
            >
              <ChoiceHand aria-hidden="true">{HANDS[hand]}</ChoiceHand>
              {LABELS[hand]}
              <ChromeFrame spikes={false} />
            </GameButton>
          ))}
        </Choices>
      )}
      {over && <AgainBar partnerName={partnerName} again={again} onAgain={onAgain} />}
    </>
  );
};

const popIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const Reveal = styled.div`
  animation: ${popIn} 260ms ease-out both;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: 0 0 20px;
  color: ${inkSoft};
  font-weight: 700;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Verdict = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RoundLabel = styled.span`
  font-size: 13px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const Hand = styled.span`
  font-size: 54px;
  line-height: 1;
  transform: ${({ $flip }) => ($flip ? "scaleX(-1)" : "none")};
`;

const Choices = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
`;

const ChoiceHand = styled.span`
  display: block;
  margin-bottom: 4px;
  font-size: 34px;
`;

export default RockPaperScissors;
