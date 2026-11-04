// Where everything on the island goes, kept apart from three.js so it can be tested. It's all
// worked out from fixed seeds, so the island is the same shape for everyone on every visit.

// The middle of the buildings and the walkable area, which isn't quite the middle of the old
// square floor. The island sits around these, so it can stay tight on every side.
export const ISLAND_CENTRE = { x: 115.8, z: -128 };

// The outline is a squircle: a rectangle with its corners rounded off. The buildings reach well
// into the rectangle's corners, so rounding it any more would leave them hanging off the edge.
const OUTLINE_ACROSS = 115;
const OUTLINE_ALONG = 121;
const OUTLINE_ROUNDNESS = 10;
const BUMP_HEIGHT = 1.5;
const RING_POINTS = 72;

// From the grass down to the last ring before the tip. Scale is how wide it is compared to
// the rim, jag is how far points can cut inwards and dip is how far they wander up and down.
const RINGS = [
  { y: -8, scale: 1, jag: 5, dip: 0 },
  { y: -13, scale: 1.01, jag: 7, dip: 3 },
  { y: -24, scale: 0.97, jag: 11, dip: 8 },
  { y: -42, scale: 0.86, jag: 12, dip: 10 },
  { y: -70, scale: 0.68, jag: 14, dip: 12 },
  { y: -102, scale: 0.46, jag: 14, dip: 14 },
  { y: -135, scale: 0.26, jag: 10, dip: 14 },
];
const TIP = { x: ISLAND_CENTRE.x + 6, y: -172, z: ISLAND_CENTRE.z - 4 };

const RIM_ROCKS = 48;
const UNDERSIDE_ROCKS = 22;
const VINES = 44;
// How far off the island's side the vines sit
const VINE_GAP = 0.9;
const THREE_SIXTY_WRAP = (angle) =>
  ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

function seededRandom(start) {
  let seed = start;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const between = (random, low, high) => low + random() * (high - low);

// The furthest out the island reaches in this direction, before any jags are cut into it
export function rimRadius(angle) {
  const squircle =
    ((Math.abs(Math.cos(angle)) / OUTLINE_ACROSS) ** OUTLINE_ROUNDNESS +
      (Math.abs(Math.sin(angle)) / OUTLINE_ALONG) ** OUTLINE_ROUNDNESS) **
    (-1 / OUTLINE_ROUNDNESS);
  const bumps =
    (Math.sin(angle * 3 + 1) + Math.sin(angle * 5 + 2.4) + 2) * 0.5 * BUMP_HEIGHT;
  return squircle + bumps;
}

function pointAt(angle, radius, y) {
  return {
    x: ISLAND_CENTRE.x + Math.cos(angle) * radius,
    y,
    z: ISLAND_CENTRE.z + Math.sin(angle) * radius,
  };
}

export function islandRings() {
  const random = seededRandom(7741);
  const rings = RINGS.map(({ y, scale, jag, dip }) => {
    const ring = [];
    for (let i = 0; i < RING_POINTS; i += 1) {
      const angle = (i / RING_POINTS) * Math.PI * 2;
      const radius = rimRadius(angle) * scale - random() * jag;
      ring.push(pointAt(angle, radius, y + (random() - 0.5) * dip));
    }
    return ring;
  });
  return { rings, tip: TIP };
}

// Where the player can walk, then the row of buildings on the left and the row along the back
function isOnTown({ x, z }) {
  const walkable = x > 70 && x < 221 && z > -190 && z < -18;
  const leftRow = x > 8.8 && x < 72 && z > -200 && z < -24;
  const backRow = x > 52 && x < 220 && z > -240.1 && z < -186;
  return walkable || leftRow || backRow;
}

// Small rocks scattered over the strip of grass around the town. They stop short of the rim
// because the jags cut up to 5 into it, and a rock there would hang over the edge.
export function rimRocks() {
  const random = seededRandom(2203);
  const rocks = [];
  while (rocks.length < RIM_ROCKS) {
    const angle = random() * Math.PI * 2;
    const point = pointAt(angle, rimRadius(angle) * between(random, 0.72, 0.955), 0);
    const size = between(random, 0.8, 3.2);
    if (!isOnTown(point)) {
      rocks.push({ ...point, y: -8 + size * 0.2, size, spin: random() * Math.PI * 2 });
    }
  }
  return rocks;
}

// How wide the island is at this height, compared to its rim
function scaleAtHeight(y) {
  for (let i = 1; i < RINGS.length; i += 1) {
    if (y >= RINGS[i].y) {
      const amount = (y - RINGS[i - 1].y) / (RINGS[i].y - RINGS[i - 1].y);
      return RINGS[i - 1].scale + (RINGS[i].scale - RINGS[i - 1].scale) * amount;
    }
  }
  return RINGS[RINGS.length - 1].scale;
}

export function undersideRocks() {
  const random = seededRandom(9127);
  const rocks = [];
  for (let i = 0; i < UNDERSIDE_ROCKS; i += 1) {
    const angle = random() * Math.PI * 2;
    const y = between(random, -18, -140);
    const point = pointAt(angle, rimRadius(angle) * scaleAtHeight(y), y);
    rocks.push({ ...point, size: between(random, 3, 8), spin: random() * Math.PI * 2 });
  }
  return rocks;
}

const radiusOf = ({ x, z }) => Math.hypot(x - ISLAND_CENTRE.x, z - ISLAND_CENTRE.z);

function ringIndexAt(angle) {
  const turn = THREE_SIXTY_WRAP(angle);
  return Math.round((turn / (Math.PI * 2)) * RING_POINTS) % RING_POINTS;
}

// How far out the actual jagged side is in this direction, at this height
function sideRadius(rings, angle, y) {
  const index = ringIndexAt(angle);
  const lower = RINGS.findIndex((ring) => ring.y <= y);
  const amount = (y - RINGS[lower - 1].y) / (RINGS[lower].y - RINGS[lower - 1].y);
  const above = radiusOf(rings[lower - 1][index]);
  const below = radiusOf(rings[lower][index]);
  return above + (below - above) * amount;
}

// Each vine starts up on the grass, comes over the edge and trails down the island's side,
// lying close against it. They're spaced evenly with a little wander, so there's no bald side
// and no neat row.
export function hangingVines() {
  const random = seededRandom(3847);
  const { rings } = islandRings();
  const vines = [];
  for (let i = 0; i < VINES; i += 1) {
    let angle = ((i + random()) / VINES) * Math.PI * 2;
    const bottom = -8 - between(random, 12, 58);
    const rimHere = radiusOf(rings[0][ringIndexAt(angle)]);
    const points = [pointAt(angle, rimHere - 4, -7.9)];
    for (let y = -10; y > bottom; y -= between(random, 4, 8)) {
      angle += (random() - 0.5) * 0.03;
      points.push(pointAt(angle, sideRadius(rings, angle, y) + VINE_GAP, y));
    }
    vines.push({ points });
  }
  return vines;
}

// The edges where something raised meets the grass, each with the direction the grass lies in.
// The plinths are the brown bases the buildings stand on, and they're about 6 tall. The path's
// kerb is only about 1, so its banks are lower and narrower.
const EDGES = [
  { kind: "plinth", from: [10.5, -24.3], to: [71.6, -24.3], out: [0, 1] },
  { kind: "plinth", from: [10.5, -199.4], to: [10.5, -24.3], out: [-1, 0] },
  { kind: "plinth", from: [10.5, -199.4], to: [52.8, -199.4], out: [0, -1] },
  { kind: "plinth", from: [52.8, -240.1], to: [52.8, -199.4], out: [-1, 0] },
  { kind: "plinth", from: [52.8, -240.1], to: [219.8, -240.1], out: [0, -1] },
  { kind: "plinth", from: [219.8, -240.1], to: [219.8, -186.2], out: [1, 0] },
  { kind: "path", from: [102, -160], to: [102, -21.6], out: [1, 0] },
  { kind: "path", from: [102, -160], to: [218, -160], out: [0, 1] },
  { kind: "path", from: [218, -186], to: [218, -160], out: [1, 0] },
  { kind: "path", from: [72, -21.6], to: [102, -21.6], out: [0, 1] },
];
const BANK_SHAPES = {
  plinth: { minDepth: 5, maxDepth: 10, minHeight: 2.4, maxHeight: 4.4, middleHeight: 0.35 },
  path: { minDepth: 2.5, maxDepth: 6, minHeight: 0.8, maxHeight: 1, middleHeight: 0.45 },
};
const GROUND = -8;
const BANK_FOOT = -7.95;
const BANK_STEP = 4.5;

function isSafelyOnIsland(point) {
  const angle = Math.atan2(point.z - ISLAND_CENTRE.z, point.x - ISLAND_CENTRE.x);
  return radiusOf(point) < rimRadius(angle) - 6;
}

function isPaved({ x, z }) {
  const pathLeg = x > 72 && x < 102 && z > -187.2 && z < -21.6;
  const pathArm = x > 72 && x < 218 && z > -187.2 && z < -160;
  const leftPlinth = x > 10.5 && x < 71.6 && z > -199.4 && z < -24.3;
  const backPlinth = x > 52.8 && x < 219.8 && z > -240.1 && z < -186.2;
  return pathLeg || pathArm || leftPlinth || backPlinth;
}

// Sloped earth along each edge. Each station is a slice across the slope: up against the edge,
// halfway down, and where it meets the grass. They get shallower towards the ends of each edge,
// and shrink wherever the island's rim is too close for a full slope.
export function edgeBanks() {
  const random = seededRandom(6607);
  return EDGES.map(({ kind, from, to, out }) => {
    const shape = BANK_SHAPES[kind];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.ceil(length / BANK_STEP);
    const along = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
    const stations = [];

    for (let i = 0; i <= count; i += 1) {
      const t = i / count;
      const x = from[0] + (to[0] - from[0]) * t;
      const z = from[1] + (to[1] - from[1]) * t;
      const taper = Math.min(1, 0.25 + Math.min(t, 1 - t) * 5);
      const wander = i === 0 || i === count ? 0 : (random() - 0.5) * 2;
      const height = between(random, shape.minHeight, shape.maxHeight);

      let depth = between(random, shape.minDepth, shape.maxDepth) * taper;
      const spotAt = (reach) => ({
        x: x + out[0] * reach + along[0] * wander,
        z: z + out[1] * reach + along[1] * wander,
      });
      while (!isSafelyOnIsland(spotAt(depth)) && depth > 0.3) depth *= 0.8;

      stations.push({
        wall: { x, y: GROUND + height, z },
        middle: { ...spotAt(depth * 0.45), y: GROUND + height * shape.middleHeight },
        outer: { ...spotAt(depth), y: BANK_FOOT },
        out,
        along,
      });
    }
    return { kind, stations };
  });
}

// Tufts of grass and small stones, scattered along the foot of every bank
export function edgeDetails() {
  const random = seededRandom(7129);
  const tufts = [];
  const pebbles = [];
  const nearby = ({ outer, out, along }, reach) => {
    const sideways = (random() - 0.5) * 4;
    return {
      x: outer.x + out[0] * reach + along[0] * sideways,
      z: outer.z + out[1] * reach + along[1] * sideways,
    };
  };
  const isGrass = (spot) => isSafelyOnIsland(spot) && !isPaved(spot);

  for (const { stations } of edgeBanks()) {
    for (const station of stations) {
      if (random() < 0.75) {
        const spot = nearby(station, random() * 1.5);
        if (isGrass(spot)) tufts.push({ ...spot, y: BANK_FOOT, size: between(random, 1.4, 3) });
      }
      if (random() < 0.22) {
        const spot = nearby(station, random() * 2);
        const size = between(random, 0.5, 1.4);
        if (isGrass(spot)) {
          pebbles.push({ ...spot, y: GROUND + size * 0.2, size, spin: random() * Math.PI * 2 });
        }
      }
    }
  }
  return { tufts, pebbles };
}
