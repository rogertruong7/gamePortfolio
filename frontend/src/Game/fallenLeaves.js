// Where the fallen blossom lands, kept apart from three.js so it can be tested. It's worked out
// from a fixed seed, so the same leaves are in the same places on every visit.

import { ISLAND_CENTRE, rimRadius } from "./islandShape.js";
import { FLOOR_Y } from "./pondShape.js";

const SEED = 6113;
const LEAF_COUNT = 240;
// Most leaves land under a tree, some on the stretch of path beside one, and the rest are anywhere
const UNDER_A_TREE = 0.55;
const ON_THE_PATH = 0.1;
const TREE_REACH = 38;
// The path is swept clean, except for this far around a tree. Only the one at the path's end is
// close enough to drop any there.
const PATH_LEAF_REACH = 48;
// The stretch of the path beside that tree
const PATH_BESIDE_TREE = { minX: 77.5, maxX: 97, minZ: -68, maxZ: -22.5 };
// Stops short of the rim, because its jags cut inwards
const FURTHEST_OUT = 0.93;

const GRASS_Y = FLOOR_Y + 0.1;
const PATH_Y = -7.75;
const SHADES = 4;

const AREA = { minX: 40, maxX: 230, minZ: -200, maxZ: -5 };

// The path's two arms, then the same arms with the raised kerb around them
const PATH_DOWN = { minX: 77.5, maxX: 97, minZ: -183.5, maxZ: -22.5 };
const PATH_ACROSS = { minX: 77.5, maxX: 217, minZ: -183.5, maxZ: -164 };
const KERB_DOWN = { minX: 71.5, maxX: 102.5, minZ: -187.5, maxZ: -21 };
const KERB_ACROSS = { minX: 71.5, maxX: 218.5, minZ: -187.5, maxZ: -160 };

function isIn(area, x, z) {
  return x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ;
}

function isOnIsland(x, z) {
  const offsetX = x - ISLAND_CENTRE.x;
  const offsetZ = z - ISLAND_CENTRE.z;
  const angle = Math.atan2(offsetZ, offsetX);
  return Math.hypot(offsetX, offsetZ) < rimRadius(angle) * FURTHEST_OUT;
}

function isUnderBuildings(x, z) {
  return (x < 72 && z < -24) || z < -186;
}

function isNearATree(trees, x, z) {
  return trees.some(([treeX, , treeZ]) => Math.hypot(x - treeX, z - treeZ) < PATH_LEAF_REACH);
}

// How high a leaf rests at this spot, or null if one can't rest there
function restingHeight(ground, trees, x, z) {
  if (isIn(PATH_DOWN, x, z) || isIn(PATH_ACROSS, x, z)) {
    return isNearATree(trees, x, z) ? PATH_Y : null;
  }
  if (isIn(KERB_DOWN, x, z) || isIn(KERB_ACROSS, x, z)) return null;
  if (isUnderBuildings(x, z) || !isOnIsland(x, z)) return null;
  // Anything higher or lower than the floor is the pond or its rocks
  return ground.heightAt(x, z) === FLOOR_Y ? GRASS_Y : null;
}

export function scatterFallenLeaves(ground, trees) {
  let seed = SEED;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const between = (low, high) => low + random() * (high - low);

  function pickSpot() {
    const kind = random();
    if (kind < UNDER_A_TREE) {
      const [treeX, , treeZ] = trees[Math.floor(random() * trees.length)];
      const angle = random() * Math.PI * 2;
      // Thicker towards the trunk
      const reach = TREE_REACH * random() ** 0.7;
      return { x: treeX + Math.cos(angle) * reach, z: treeZ + Math.sin(angle) * reach };
    }
    if (kind < UNDER_A_TREE + ON_THE_PATH) {
      return {
        x: between(PATH_BESIDE_TREE.minX, PATH_BESIDE_TREE.maxX),
        z: between(PATH_BESIDE_TREE.minZ, PATH_BESIDE_TREE.maxZ),
      };
    }
    return { x: between(AREA.minX, AREA.maxX), z: between(AREA.minZ, AREA.maxZ) };
  }

  const leaves = [];
  while (leaves.length < LEAF_COUNT) {
    const { x, z } = pickSpot();
    const y = restingHeight(ground, trees, x, z);
    if (y !== null) {
      leaves.push({
        x,
        y,
        z,
        spin: random() * Math.PI * 2,
        tiltX: between(-0.05, 0.05),
        tiltZ: between(-0.05, 0.05),
        size: between(1.1, 2.1),
        shade: Math.floor(random() * SHADES),
      });
    }
  }
  return leaves;
}
