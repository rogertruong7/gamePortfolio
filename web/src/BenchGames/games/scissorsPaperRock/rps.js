// Rounds go on until one of them has won three. A draw doesn't count towards either.
export const WINS_NEEDED = 3;

const BEATS = { scissors: "paper", paper: "rock", rock: "scissors" };

// 1 if a beats b, -1 if b beats a, 0 for a draw
export function compare(a, b) {
  if (a === b) return 0;
  return BEATS[a] === b ? 1 : -1;
}

// The score from each round's two picks, as [mine, theirs]
export function tally(rounds) {
  return rounds.reduce(
    ([mine, theirs], { me, them }) => {
      const result = compare(me, them);
      return [mine + (result === 1 ? 1 : 0), theirs + (result === -1 ? 1 : 0)];
    },
    [0, 0]
  );
}

export const matchOver = ([mine, theirs]) => mine >= WINS_NEEDED || theirs >= WINS_NEEDED;
