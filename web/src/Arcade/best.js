import { readStore, writeStore } from "../Helpers/storage.js";

// Each arcade game's best score on this browser

const keyOf = (game) => `arcadeBest-${game}`;

export function readBest(game) {
  const value = Number(readStore(keyOf(game)));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

// Keeps the score if it beats the best, and says whether it did
export function saveBest(game, score) {
  if (!Number.isFinite(score) || score <= readBest(game)) return false;
  writeStore(keyOf(game), String(Math.floor(score)));
  return true;
}
