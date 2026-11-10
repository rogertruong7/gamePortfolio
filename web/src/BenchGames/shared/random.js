// A random number generator that gives the same numbers from the same seed, so one player can
// pick a seed, send it over, and both screens build the same grid, wind or layout from it.
// mulberry32: small and plenty good enough for games.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A seed that fits in a play message (protocol.js caps numbers at a million)
export const newSeed = (random = Math.random) => Math.floor(random() * 1e6);
