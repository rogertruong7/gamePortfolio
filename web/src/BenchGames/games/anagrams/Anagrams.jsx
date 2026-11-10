import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ChromeFrame from "../../../UserInterface/ChromeFrame.jsx";
import { focusBlue, ink, inkSoft, pixel } from "../../../UserInterface/Modal.jsx";
import { loadSixLetterWords, loadWords } from "../../shared/dictionary.js";
import { GameButton } from "../../shared/gameParts.jsx";
import { canMake, makeRack, shuffleLetters, takeLetters, wordsFrom } from "./anagrams.js";
import { WordRound } from "../wordHunt/WordHunt.jsx";

const anagramLoad = () =>
  Promise.all([loadSixLetterWords(), loadWords()]).then(([six, words]) => {
    if (!six.length || !words.size) throw new Error("The word lists came back empty");
    return { six, words };
  });

const anagramBuild = (seed, { six, words }) => {
  const rack = makeRack(seed, six);
  return { ...rack, total: wordsFrom(rack.letters, words).length };
};

const anagramCheck = (word, puzzle, { words }) => {
  if (!canMake(word, puzzle.letters)) return "Only these letters, once each";
  if (!words.has(word)) return "Not in the word list";
  return null;
};

const anagramAbout = (puzzle) =>
  `The word was ${puzzle.word.toUpperCase()}. There were ${puzzle.total} words to find.`;

// Tap the letters or type them to build a word. Each letter goes once per word, and shuffling
// only moves them about on this screen. Space shuffles too.
const RackBoard = ({ puzzle, playing, hidden, submit }) => {
  const { letters } = puzzle;
  const [order, setOrder] = useState(() => letters.map((_, i) => i));
  const [typed, setTyped] = useState("");
  const input = useRef(null);
  const used = takeLetters(typed, letters) ?? [];
  const finePointer = () => window.matchMedia?.("(pointer: fine)").matches;

  // The keyboard pops up over the letters on phones, so it's only focused with a mouse about
  useEffect(() => {
    if (playing && finePointer()) input.current?.focus();
  }, [playing]);

  const add = (i) => {
    if (!playing || used.includes(i)) return;
    setTyped(typed + letters[i]);
    if (finePointer()) input.current?.focus();
  };

  // Anything that can't be made from the letters left is just not taken
  const onType = (event) => {
    const next = event.target.value.toLowerCase().replace(/[^a-z]/g, "");
    if (canMake(next, letters)) setTyped(next);
  };

  const onKeyDown = (event) => {
    if (event.key !== " ") return;
    event.preventDefault();
    if (playing) setOrder((current) => shuffleLetters(current));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!typed) return;
    submit(typed);
    setTyped("");
  };

  return (
    <form onSubmit={onSubmit}>
      <TypeBox
        ref={input}
        value={typed}
        onChange={onType}
        onKeyDown={onKeyDown}
        readOnly={!playing}
        aria-label="Your word. Type it or tap the letters. Space shuffles."
        placeholder={playing ? "Tap or type" : "Wait for the letters…"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
      />
      <Rack role="group" aria-label="Letters">
        {order.map((i) => (
          <Letter
            key={i}
            type="button"
            onClick={() => add(i)}
            disabled={!playing || hidden || used.includes(i)}
            aria-label={hidden ? "Hidden letter" : letters[i].toUpperCase()}
          >
            {hidden ? "" : letters[i].toUpperCase()}
          </Letter>
        ))}
      </Rack>
      <Actions>
        <GameButton
          type="button"
          onClick={() => setTyped(typed.slice(0, -1))}
          disabled={!playing || !typed}
        >
          Back
          <ChromeFrame spikes={false} />
        </GameButton>
        <GameButton
          type="button"
          onClick={() => setOrder((current) => shuffleLetters(current))}
          disabled={!playing}
        >
          Shuffle
          <ChromeFrame spikes={false} />
        </GameButton>
        <GameButton type="submit" disabled={!playing || !typed}>
          Enter
          <ChromeFrame spikes={false} />
        </GameButton>
      </Actions>
    </form>
  );
};

// Make as many words as possible from one shuffled six letter word
const Anagrams = (props) => (
  <WordRound
    {...props}
    seconds={60}
    load={anagramLoad}
    build={anagramBuild}
    check={anagramCheck}
    Board={RackBoard}
    about={anagramAbout}
  />
);

const TypeBox = styled.input`
  display: block;
  width: min(100%, 300px);
  margin: 0 auto;
  padding: 10px 14px;
  border: 2px solid ${inkSoft};
  border-radius: 12px;
  color: ${ink};
  background: #fff;
  font: 600 28px / 1.2 ${pixel};
  font-variant-ligatures: none;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;

  &::placeholder {
    font-size: 20px;
    letter-spacing: normal;
    text-transform: none;
  }

  &:focus {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
  }
`;

const Rack = styled.div`
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  width: min(100%, 380px);
  margin: 16px auto 0;
  padding: 8px;
  border-radius: 16px;
  background: linear-gradient(#c6d0e1, #a9b6cd);
  box-shadow: inset 0 2px 4px rgba(20, 35, 90, 0.25);
`;

const Letter = styled.button`
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 12px;
  color: ${ink};
  background: linear-gradient(#fff, #e3e8f0);
  box-shadow:
    inset 0 -3px 0 rgba(20, 35, 90, 0.18),
    0 1px 2px rgba(0, 0, 0, 0.25);
  font: 600 clamp(22px, 7vw, 32px) / 1 ${pixel};
  font-variant-ligatures: none;
  cursor: pointer;
  transition: transform 90ms ease-out;

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 14px;
  margin-top: 16px;
`;

export default Anagrams;
