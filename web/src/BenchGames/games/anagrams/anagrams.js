import { seededRandom } from "../../shared/random.js";

// Anagrams: one six letter word, shuffled, and as many words as can be made from its letters.
// Scoring and the end of round swap of words are Word Hunt's (wordHunt.js).

export const MIN_LETTERS = 3;

// Fisher-Yates. Tries again if it comes out as the word itself, so the answer isn't given away.
export function shuffleLetters(letters, random = Math.random) {
  const start = [...letters];
  let mixed = start;
  for (let tries = 0; tries < 10; tries += 1) {
    mixed = [...start];
    for (let i = mixed.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
    }
    if (mixed.join("") !== start.join("")) break;
  }
  return mixed;
}

// The same seed and list always give the same word in the same order, so both players get it
export function makeRack(seed, sixLetterWords) {
  const random = seededRandom(seed);
  const word = sixLetterWords[Math.floor(random() * sixLetterWords.length)];
  return { word, letters: shuffleLetters(word, random) };
}

// Which of letters spell out word, each used once, as their places in letters. Null if word needs
// a letter that isn't there, or more of one than there is.
export function takeLetters(word, letters) {
  const taken = [];
  for (const letter of word) {
    const at = letters.findIndex((l, i) => l === letter && !taken.includes(i));
    if (at < 0) return null;
    taken.push(at);
  }
  return taken;
}

export const canMake = (word, letters) => takeLetters(word, letters) !== null;

// Every word in words (a Set) that can be made from letters
export function wordsFrom(letters, words) {
  const made = [];
  for (const word of words) {
    if (word.length >= MIN_LETTERS && word.length <= letters.length && canMake(word, letters)) {
      made.push(word);
    }
  }
  return made;
}
