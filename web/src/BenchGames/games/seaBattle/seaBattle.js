// Sea Battle on an 8 by 8 grid. Cells are numbered row by row from the top left, so cell i is at
// column i % 8 and row Math.floor(i / 8). A fleet is one { start, down } per ship, in the same
// order as SHIPS, which says how long each one is: start is its top or left end, and down says
// whether it runs down the grid or across it. Ships can touch but not overlap.
export const SIZE = 8;
export const CELLS = SIZE * SIZE;
export const SHIPS = [4, 3, 3, 2, 2];
export const RESULTS = ["miss", "hit", "sunk"];

const isCell = (cell) => Number.isInteger(cell) && cell >= 0 && cell < CELLS;

// The cells a ship covers, or null if it runs off the grid
export function shipCells(start, length, down) {
  if (!isCell(start)) return null;
  const column = start % SIZE;
  const row = Math.floor(start / SIZE);
  if (down ? row + length > SIZE : column + length > SIZE) return null;
  return Array.from({ length }, (_, i) => start + i * (down ? SIZE : 1));
}

export const fleetCells = (fleet) =>
  fleet.map((ship, i) => shipCells(ship.start, SHIPS[i], ship.down));

// Whether ship number which could go at start, running down or across, without leaving the grid
// or landing on any of the others
export function fitsAt(fleet, which, start, down) {
  const cells = shipCells(start, SHIPS[which], down);
  if (!cells) return false;
  const others = new Set(
    fleetCells(fleet)
      .filter((_, i) => i !== which)
      .flat()
  );
  return cells.every((cell) => !others.has(cell));
}

export const isValidFleet = (fleet) =>
  Array.isArray(fleet) &&
  fleet.length === SHIPS.length &&
  fleet.every(
    (ship, i) => ship && typeof ship.down === "boolean" && fitsAt(fleet, i, ship.start, ship.down)
  );

// Moves a ship so it starts at start, nudging it back in from the edge if it would run off. null
// when it would land on another ship.
export function moveShip(fleet, which, start, down = fleet[which].down) {
  if (!isCell(start)) return null;
  const length = SHIPS[which];
  let column = start % SIZE;
  let row = Math.floor(start / SIZE);
  if (down) row = Math.min(row, SIZE - length);
  else column = Math.min(column, SIZE - length);
  const nudged = row * SIZE + column;
  if (!fitsAt(fleet, which, nudged, down)) return null;
  return fleet.map((ship, i) => (i === which ? { start: nudged, down } : ship));
}

// Turns a ship the other way about its start, or null if there's no room for it
export const turnShip = (fleet, which) =>
  moveShip(fleet, which, fleet[which].start, !fleet[which].down);

// A fresh fleet scattered at random. Each ship tries spots until it fits, and with this much
// room it always finds one quickly.
export function randomFleet(random = Math.random) {
  for (;;) {
    const fleet = [];
    let placed = true;
    for (let which = 0; which < SHIPS.length && placed; which += 1) {
      placed = false;
      for (let tries = 0; tries < 200; tries += 1) {
        const down = random() < 0.5;
        const start = Math.floor(random() * CELLS);
        const candidate = [...fleet, { start, down }];
        if (fitsAt(candidate, which, start, down)) {
          fleet.push({ start, down });
          placed = true;
          break;
        }
      }
    }
    if (placed) return fleet;
  }
}

// A fleet goes over the wire as one number per ship, its start doubled plus one if it runs down
export const encodeFleet = (fleet) => fleet.map((ship) => ship.start * 2 + (ship.down ? 1 : 0));

export function decodeFleet(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== SHIPS.length) return null;
  if (!numbers.every((n) => Number.isInteger(n) && n >= 0 && n < CELLS * 2)) return null;
  const fleet = numbers.map((n) => ({ start: Math.floor(n / 2), down: n % 2 === 1 }));
  return isValidFleet(fleet) ? fleet : null;
}

// What the defender says about a shot at cell, given every cell shot at before it. A ship is sunk
// once every one of its cells has been hit, and then all of them are given so the shooter can see
// which ship it was.
export function answerShot(fleet, earlier, cell) {
  const shot = new Set([...earlier, cell]);
  const ship = fleetCells(fleet).find((cells) => cells.includes(cell));
  if (!ship) return { result: "miss", sunk: [] };
  if (ship.every((c) => shot.has(c))) return { result: "sunk", sunk: [...ship] };
  return { result: "hit", sunk: [] };
}

// Whose shot number shot is. The first game is opened by whoever sent the invite, and each
// rematch swaps who fires first.
export const shooterOf = (shot, match) => (shot + match) % 2;

// The lengths of the ships still afloat, given the shots so far ({ cell, result, sunk })
export function shipsLeft(shots) {
  const left = [...SHIPS];
  for (const shot of shots) {
    if (shot.result !== "sunk") continue;
    left.splice(left.indexOf(shot.sunk.length), 1);
  }
  return left;
}

export const allSunk = (shots) => shipsLeft(shots).length === 0;

// Whether a defender's answer to a shot could be true, before their fleet is known. A miss has to
// leave enough unshot cells for the ships still afloat, and a hit can't be the one that finishes
// the last of them off, as that would sink it. A sunk ship has to be one still afloat, lie in a
// straight unbroken line through the cell just shot, and be made only of hits not yet put down to
// another ship.
export function plausibleAnswer(shots, cell, result, sunk) {
  if (!RESULTS.includes(result)) return false;
  const afloat = shipsLeft(shots).reduce((sum, length) => sum + length, 0);
  const sunkCells = new Set(shots.flatMap((shot) => shot.sunk));
  const openHits = shots.filter(
    (shot) => shot.result === "hit" && !sunkCells.has(shot.cell)
  ).length;
  if (result === "miss") {
    const unshot = CELLS - shots.length - 1;
    if (unshot < afloat - openHits) return false;
  }
  if (result === "hit" && openHits + 1 >= afloat) return false;
  if (result !== "sunk") return Array.isArray(sunk) && sunk.length === 0;
  if (!Array.isArray(sunk) || !sunk.every(isCell) || !sunk.includes(cell)) return false;
  if (!shipsLeft(shots).includes(sunk.length) || new Set(sunk).size !== sunk.length) return false;
  const sorted = [...sunk].sort((a, b) => a - b);
  const down = sorted.length > 1 && sorted[1] - sorted[0] === SIZE;
  const line = shipCells(sorted[0], sorted.length, down);
  if (!line || !line.every((c, i) => c === sorted[i])) return false;
  const sunkBefore = new Set(shots.flatMap((shot) => shot.sunk));
  const hitBefore = new Set(shots.filter((shot) => shot.result === "hit").map((shot) => shot.cell));
  return sorted.every((c) => c === cell || (hitBefore.has(c) && !sunkBefore.has(c)));
}

// Once the game is over and their fleet comes out, whether every answer they gave was true
export function answersMatch(fleet, shots) {
  const earlier = [];
  for (const shot of shots) {
    const answer = answerShot(fleet, earlier, shot.cell);
    earlier.push(shot.cell);
    if (answer.result !== shot.result) return false;
    const said = [...shot.sunk].sort((a, b) => a - b);
    const truth = [...answer.sunk].sort((a, b) => a - b);
    if (said.length !== truth.length || !said.every((c, i) => c === truth[i])) return false;
  }
  return true;
}

const hex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

// A random string kept secret until the end, mixed in with the fleet so the commitment can't be
// worked back to it by trying every possible fleet. Empty if the browser can't make one.
export function newSalt(crypto = globalThis.crypto) {
  if (!crypto?.getRandomValues) return "";
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

// The commitment sent with "ready": the first half of a SHA-256 of the salt and the fleet. It
// says nothing about where the ships are, but once the fleet and salt are shown at the end it
// proves the fleet wasn't moved during the game. Empty when the page isn't allowed the hashing
// (plain http away from localhost), and then only the answers are checked at the end.
export async function commitFleet(fleet, salt, crypto = globalThis.crypto) {
  if (!salt || !crypto?.subtle) return "";
  try {
    const text = new TextEncoder().encode(`${salt}:${encodeFleet(fleet).join(",")}`);
    const digest = await crypto.subtle.digest("SHA-256", text);
    return hex(new Uint8Array(digest)).slice(0, 32);
  } catch {
    return "";
  }
}

export const isCommitment = (value) => typeof value === "string" && /^([0-9a-f]{32})?$/.test(value);

// Where the arrow keys take the focus on the grid. It stops at the edges.
export function stepFocus(index, key) {
  const column = index % SIZE;
  const row = Math.floor(index / SIZE);
  if (key === "ArrowLeft") return column > 0 ? index - 1 : index;
  if (key === "ArrowRight") return column < SIZE - 1 ? index + 1 : index;
  if (key === "ArrowUp") return row > 0 ? index - SIZE : index;
  if (key === "ArrowDown") return row < SIZE - 1 ? index + SIZE : index;
  return null;
}
