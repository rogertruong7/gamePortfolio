// How high the ground is in and around the pond, and where the open water is.

export const WATER_Y = -7.7;

export const FLOOR_Y = -8;
// The character's feet sit below the surface when it's in the water, so it looks like it's wading
const WADING_Y = WATER_Y - 0.9;

// The water's edge as [x, z], read from the pond in floorDetails.glb
const POND_OUTLINE = [
  [130.2, -89.2],
  [134.4, -94],
  [135.7, -103.6],
  [138.8, -115.9],
  [142.5, -121.5],
  [143.4, -126.9],
  [152.4, -132.7],
  [162.7, -135.6],
  [177.6, -131.3],
  [184.8, -123.5],
  [189.4, -113.9],
  [187.4, -108.7],
  [187.6, -102],
  [183.7, -89.9],
  [179.8, -81.1],
  [180.9, -74.8],
  [177.3, -68.9],
  [170.7, -63.9],
  [161, -56.7],
  [137.6, -63.4],
  [133.1, -74.5],
  [130.2, -82.3],
];

const CELL_SIZE = 2;
const MARGIN_CELLS = 2;
// Anywhere with no rock, lower than every other height so it never wins against one
const NO_ROCK = -9;
// A rock has to be this far out of the way for a spot to count as open water
const CLEAR_OF_ROCKS = -7.9;

function isOverPond(x, z) {
  let inside = false;
  for (let i = 0, j = POND_OUTLINE.length - 1; i < POND_OUTLINE.length; j = i, i += 1) {
    const [ax, az] = POND_OUTLINE[i];
    const [bx, bz] = POND_OUTLINE[j];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

function boundsOf(triangles) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const triangle of triangles) {
    for (const [x, , z] of triangle) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minZ, maxZ };
}

// The height of a triangle above a point, or null if the point isn't under it
function heightOnTriangle([a, b, c], x, z) {
  const area = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
  if (Math.abs(area) < 1e-9) return null;
  const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / area;
  const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / area;
  const w = 1 - u - v;
  if (u < 0 || v < 0 || w < 0) return null;
  return u * a[1] + v * b[1] + w * c[1];
}

// Evens out the gaps between rocks, so the character glides over them instead of jolting
function blurred(cells, columns, rows) {
  const result = new Float32Array(cells.length);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let total = 0;
      for (let r = row - 1; r <= row + 1; r += 1) {
        for (let c = column - 1; c <= column + 1; c += 1) {
          const inGrid = r >= 0 && r < rows && c >= 0 && c < columns;
          total += inGrid ? cells[r * columns + c] : NO_ROCK;
        }
      }
      result[row * columns + column] = total / 9;
    }
  }
  return result;
}

// Takes the rocks' triangles in world space, each as three [x, y, z] corners
export function createGroundMap(triangles) {
  const rocks = boundsOf(triangles);
  // A margin of empty cells all round lets the height fall away smoothly past the last rock
  const minX = rocks.minX - MARGIN_CELLS * CELL_SIZE;
  const minZ = rocks.minZ - MARGIN_CELLS * CELL_SIZE;
  const columns = Math.ceil((rocks.maxX - minX) / CELL_SIZE) + MARGIN_CELLS + 1;
  const rows = Math.ceil((rocks.maxZ - minZ) / CELL_SIZE) + MARGIN_CELLS + 1;
  const tops = new Float32Array(columns * rows).fill(NO_ROCK);

  for (const triangle of triangles) {
    const bounds = boundsOf([triangle]);
    const firstColumn = Math.floor((bounds.minX - minX) / CELL_SIZE);
    const lastColumn = Math.ceil((bounds.maxX - minX) / CELL_SIZE);
    const firstRow = Math.floor((bounds.minZ - minZ) / CELL_SIZE);
    const lastRow = Math.ceil((bounds.maxZ - minZ) / CELL_SIZE);
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const height = heightOnTriangle(
          triangle,
          minX + column * CELL_SIZE,
          minZ + row * CELL_SIZE
        );
        const cell = row * columns + column;
        if (height !== null && height > tops[cell]) tops[cell] = height;
      }
    }
  }

  const cells = blurred(tops, columns, rows);

  function rockHeight(x, z) {
    const across = (x - minX) / CELL_SIZE;
    const down = (z - minZ) / CELL_SIZE;
    const column = Math.floor(across);
    const row = Math.floor(down);
    if (column < 0 || row < 0 || column >= columns - 1 || row >= rows - 1) return NO_ROCK;

    const alongColumn = across - column;
    const alongRow = down - row;
    const cell = row * columns + column;
    const top =
      cells[cell] + (cells[cell + 1] - cells[cell]) * alongColumn;
    const bottom =
      cells[cell + columns] + (cells[cell + columns + 1] - cells[cell + columns]) * alongColumn;
    return top + (bottom - top) * alongRow;
  }

  return {
    // Where the character's feet go at this spot
    heightAt(x, z) {
      return Math.max(isOverPond(x, z) ? WADING_Y : FLOOR_Y, rockHeight(x, z));
    },
    isWater(x, z) {
      return isOverPond(x, z) && rockHeight(x, z) < CLEAR_OF_ROCKS;
    },
  };
}
