import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ISLAND_CENTRE,
  edgeBanks,
  edgeDetails,
  gardenRocks,
  islandRings,
  rimRadius,
  rimRocks,
  undersideRocks,
} from "../src/Game/scenery/islandShape.js";

// Everything that has to stay on solid ground: the furthest the player can reach with their big
// head included, the ends of the path, the buildings' furthest corners, the big tree, and the
// telephone pole that pokes out past all of them
const TOWN_POINTS = [
  [219, -20],
  [219, -190],
  [218, -21.6],
  [10.5, -24.3],
  [10.5, -199.4],
  [219.8, -240.1],
  [52.8, -240.1],
  [8.8, -197],
  [8.8, -139.6],
  [33, -219],
  [128, -245.3],
];

function isInsidePolygon(polygon, x, z) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

const radiusOf = ({ x, z }) => Math.hypot(x - ISLAND_CENTRE.x, z - ISLAND_CENTRE.z);
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

test("the whole town sits on the island", () => {
  const rim = islandRings().rings[0];
  for (const [x, z] of TOWN_POINTS) {
    assert.ok(isInsidePolygon(rim, x, z), `${x}, ${z} hangs off the edge`);
  }
});

test("its corners are rounded off", () => {
  const across = rimRadius(0);
  const along = rimRadius(Math.PI / 2);
  const towardsCorner = rimRadius(Math.atan2(along, across));
  assert.ok(towardsCorner < Math.hypot(across, along) * 0.96);
});

test("its sides hug the town", () => {
  // Measured from the island's own middle: how far each edge can reach at most
  const sides = [
    [0, 120],
    [Math.PI, 120],
    [Math.PI / 2, 125],
    [-Math.PI / 2, 125],
  ];
  for (const [angle, limit] of sides) assert.ok(rimRadius(angle) < limit);
});

test("the edge is jagged rather than smooth", () => {
  const radii = islandRings().rings[0].map(radiusOf);
  const steps = radii.map((radius, i) => Math.abs(radius - radii[(i + 1) % radii.length]));
  assert.ok(average(steps) > 1.5, "neighbouring points should differ noticeably");
});

test("it's the same island every time", () => {
  assert.deepEqual(islandRings(), islandRings());
  assert.deepEqual(rimRocks(), rimRocks());
});

test("it narrows on the way down to a point", () => {
  const { rings, tip } = islandRings();
  const sizes = rings.map((ring) => average(ring.map(radiusOf)));
  for (let i = 2; i < sizes.length; i += 1) {
    assert.ok(sizes[i] < sizes[i - 1], `ring ${i} should be narrower than the one above it`);
  }
  assert.ok(tip.y < Math.min(...rings[rings.length - 1].map((point) => point.y)));
  assert.ok(sizes[sizes.length - 1] < sizes[0] / 2);
});

test("every ring has the same number of points, so they can be joined up", () => {
  const { rings } = islandRings();
  for (const ring of rings) assert.equal(ring.length, rings[0].length);
});

test("the grass around the edge has plenty of small rocks", () => {
  const rocks = rimRocks();
  assert.ok(rocks.length >= 40);
  for (const rock of rocks) assert.ok(rock.size <= 3.5);
});

test("rocks on the grass stay off everywhere the player can walk", () => {
  for (const rock of rimRocks()) {
    // The walkable area inside the invisible walls, plus a little room for the rock's size
    const walkable = rock.x > 70 && rock.x < 221 && rock.z > -190 && rock.z < -18;
    assert.ok(!walkable, `a rock at ${rock.x}, ${rock.z} is where the player walks`);
  }
});

test("rocks on the grass stay off the buildings", () => {
  for (const rock of rimRocks()) {
    const onLeftRow = rock.x > 8.8 && rock.x < 72 && rock.z > -200 && rock.z < -24;
    const onBackRow = rock.x > 52 && rock.x < 220 && rock.z > -240.1 && rock.z < -186;
    assert.ok(!onLeftRow && !onBackRow, `a rock at ${rock.x}, ${rock.z} is on a building`);
  }
});

test("rocks on the grass don't hang off the jagged edge", () => {
  // The jags cut up to 5 inwards from the furthest the island reaches
  for (const rock of rimRocks()) {
    const angle = Math.atan2(rock.z - ISLAND_CENTRE.z, rock.x - ISLAND_CENTRE.x);
    assert.ok(radiusOf(rock) <= rimRadius(angle) - 5);
  }
});

test("the rocks in the garden stay on the grass", () => {
  // The open water, and the path with its kerb
  const isInWater = ({ x, z }) => x > 137 && x < 184 && z > -136 && z < -57;
  const isOnPath = ({ x, z }) =>
    (x > 72 && x < 102 && z > -187 && z < -21.6) || (x > 72 && x < 218 && z > -187 && z < -160);
  const rocks = gardenRocks();
  assert.ok(rocks.length <= 12);
  for (const rock of rocks) {
    const angle = Math.atan2(rock.z - ISLAND_CENTRE.z, rock.x - ISLAND_CENTRE.x);
    assert.ok(radiusOf(rock) <= rimRadius(angle) - 5, `${rock.x}, ${rock.z} is too near the edge`);
    assert.ok(!isOnPath(rock), `${rock.x}, ${rock.z} is on the path`);
    assert.ok(!isInWater(rock), `${rock.x}, ${rock.z} is in the pond`);
  }
});

test("cliff rocks are spread around the island, below the green of the rim", () => {
  const rocks = undersideRocks();
  for (const rock of rocks) assert.ok(rock.y < -20);
  const quarters = new Set(
    rocks.map(({ x, z }) =>
      Math.floor((Math.atan2(z - ISLAND_CENTRE.z, x - ISLAND_CENTRE.x) + Math.PI) / (Math.PI / 2))
    )
  );
  assert.equal(quarters.size, 4);
});

test("cliff rocks sit on the cliff's surface, between two of its rings", () => {
  const { rings } = islandRings();
  for (const rock of undersideRocks()) {
    const angle = Math.atan2(rock.z - ISLAND_CENTRE.z, rock.x - ISLAND_CENTRE.x);
    const turn = (angle + Math.PI * 2) % (Math.PI * 2);
    const index = Math.round((turn / (Math.PI * 2)) * rings[0].length) % rings[0].length;
    const onASegment = rings.slice(1).some((ring, i) => {
      const [above, below] = [rings[i][index], ring[index]];
      const radius = radiusOf(rock);
      return (
        rock.y <= above.y + 1e-9 &&
        rock.y >= below.y - 1e-9 &&
        radius <= Math.max(radiusOf(above), radiusOf(below)) + 1e-9 &&
        radius >= Math.min(radiusOf(above), radiusOf(below)) - 1e-9
      );
    });
    assert.ok(onASegment, `${rock.x}, ${rock.y}, ${rock.z} isn't on the cliff`);
  }
});

test("cliff rocks face outwards from the island", () => {
  for (const { x, z, facing } of undersideRocks()) {
    assert.ok(Math.abs(Math.hypot(facing.x, facing.y, facing.z) - 1) < 1e-9);
    assert.ok(facing.x * (x - ISLAND_CENTRE.x) + facing.z * (z - ISLAND_CENTRE.z) > 0);
  }
});

// What the transitions must stay off: the path with its kerbs, and the two brown plinths
function isOnPathOrPlinth({ x, z }) {
  const pathLeg = x > 72 && x < 102 && z > -187.2 && z < -21.6;
  const pathArm = x > 72 && x < 218 && z > -187.2 && z < -160;
  const leftPlinth = x > 10.5 && x < 71.6 && z > -199.4 && z < -24.3;
  const backPlinth = x > 52.8 && x < 219.8 && z > -240.1 && z < -186.2;
  return pathLeg || pathArm || leftPlinth || backPlinth;
}

function isInsideRim({ x, z }) {
  return isInsidePolygon(islandRings().rings[0], x, z);
}

test("there are banks along both the plinths and the path", () => {
  const kinds = new Set(edgeBanks().map((bank) => bank.kind));
  assert.deepEqual([...kinds].sort(), ["path", "plinth"]);
});

test("banks slope from up against the edge down to the ground", () => {
  for (const { stations } of edgeBanks()) {
    for (const { wall, outer } of stations) {
      assert.ok(wall.y > outer.y);
      assert.ok(outer.y > -8, "should sit just above the grass");
      assert.ok(outer.y < -7.8);
    }
  }
});

test("banks spread onto the grass, not onto the path or the plinths", () => {
  for (const { stations } of edgeBanks()) {
    for (const { outer } of stations) assert.ok(!isOnPathOrPlinth(outer));
  }
});

test("banks stay on the island", () => {
  for (const { stations } of edgeBanks()) {
    for (const { outer } of stations) assert.ok(isInsideRim(outer));
  }
});

test("tufts and pebbles along the edges stay on the grass", () => {
  const { tufts, pebbles } = edgeDetails();
  assert.ok(tufts.length >= 60);
  assert.ok(pebbles.length >= 15);
  for (const spot of [...tufts, ...pebbles]) {
    assert.ok(!isOnPathOrPlinth(spot), `${spot.x}, ${spot.z} isn't on the grass`);
    assert.ok(isInsideRim(spot), `${spot.x}, ${spot.z} is off the island`);
  }
});
