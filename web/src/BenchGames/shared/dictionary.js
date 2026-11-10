// The word games' word lists, fetched the first time one is played and kept after that.
// valid.txt is every word of 3 to 8 letters from ENABLE, a public domain list of English words,
// and six.txt is the everyday six letter words from it that a round of Anagrams can be built on.
let validWords = null;
let sixLetterWords = null;

async function fetchList(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Couldn't load ${path} (${response.status})`);
  const text = await response.text();
  return text.split("\n").filter((word) => /^[a-z]+$/.test(word));
}

// Every word that counts, as a Set. Rejects if the list couldn't be loaded.
export function loadWords() {
  if (!validWords) {
    validWords = fetchList("/words/valid.txt")
      .then((words) => new Set(words))
      .catch((error) => {
        // So the next game tries again rather than failing straight away
        validWords = null;
        throw error;
      });
  }
  return validWords;
}

export function loadSixLetterWords() {
  if (!sixLetterWords) {
    sixLetterWords = fetchList("/words/six.txt").catch((error) => {
      sixLetterWords = null;
      throw error;
    });
  }
  return sixLetterWords;
}
