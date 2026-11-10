// Turns from one angle towards another by the short way round, however many times the first has
// wound around. Amount goes from 0, still at the first angle, to 1, facing the same way as the second.
export function turnTowardsAngle(from, to, amount) {
  const fullTurn = Math.PI * 2;
  const difference = to - from;
  const shortest = difference - fullTurn * Math.round(difference / fullTurn);
  return from + shortest * amount;
}
