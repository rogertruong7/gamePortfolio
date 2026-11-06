// Two can share a bench. On their own, someone sits in the middle. With two, each sits this far
// along from the middle.
export const SEATS_PER_BENCH = 2;
const SHARED_SEAT_ALONG = 5.4;

// Where on a bench someone sits, out of everyone claiming it: each is { id, bench, since }.
// Everyone works it out the same way: the first there takes one end and the second the other,
// or the middle when on their own. Null means the bench is already full.
export function seatAlong(me, claims) {
  const sharing = claims
    .filter((claim) => claim.bench === me.bench && claim.id !== me.id)
    .concat(me)
    .sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
  const place = sharing.findIndex((claim) => claim.id === me.id);
  if (place >= SEATS_PER_BENCH) return null;
  if (sharing.length === 1) return 0;
  return place === 0 ? -SHARED_SEAT_ALONG : SHARED_SEAT_ALONG;
}

export function benchIsFull(benchIndex, claims) {
  return claims.filter((claim) => claim.bench === benchIndex).length >= SEATS_PER_BENCH;
}
