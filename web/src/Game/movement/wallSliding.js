// Moves the character without letting it into a wall. Walls are anything with a
// closestPoint(position), and the character is a circle of the given radius on the ground.

// Long moves are checked in pieces, so a slow frame can't carry it through a wall
const MAX_STEP = 1;
// Sliding along a wall can round off closer to it by a hair, which shouldn't count
const ROUNDING = 1e-6;
const SMALLEST_SLIDE = 1e-3;

function gapTo(wall, position) {
  const closest = wall.closestPoint(position);
  return Math.hypot(position.x - closest.x, position.z - closest.z);
}

// Stepping further out of a wall is always allowed, so nothing can ever get stuck inside one
function wallsInTheWay(from, to, walls, radius) {
  return walls.filter((wall) => {
    const gap = gapTo(wall, to);
    return gap <= radius && gap < gapTo(wall, from) - ROUNDING;
  });
}

export function isBlocked(from, to, walls, radius) {
  return wallsInTheWay(from, to, walls, radius).length > 0;
}

// The same step turned to run along the wall, at the same speed. It's measured from where the
// character is now, because that's the line that can't take it any closer to the wall.
function slideAlong(wall, position, stepX, stepZ) {
  const closest = wall.closestPoint(position);
  const awayX = position.x - closest.x;
  const awayZ = position.z - closest.z;
  const gap = Math.hypot(awayX, awayZ);
  if (gap === 0) return null;

  const into = (stepX * awayX + stepZ * awayZ) / gap;
  const slideX = stepX - (into * awayX) / gap;
  const slideZ = stepZ - (into * awayZ) / gap;
  const slideLength = Math.hypot(slideX, slideZ);
  const stepLength = Math.hypot(stepX, stepZ);
  if (slideLength <= stepLength * SMALLEST_SLIDE) return null;

  const scale = stepLength / slideLength;
  return { x: position.x + slideX * scale, y: position.y, z: position.z + slideZ * scale };
}

function takeStep(position, stepX, stepZ, walls, radius) {
  const to = { x: position.x + stepX, y: position.y, z: position.z + stepZ };
  const hit = wallsInTheWay(position, to, walls, radius);
  if (hit.length === 0) return to;

  for (const wall of hit) {
    const slid = slideAlong(wall, position, stepX, stepZ);
    if (slid && !isBlocked(position, slid, walls, radius)) return slid;
  }
  return null;
}

// Updates position's x and z
export function moveAndSlide(position, moveX, moveZ, walls, radius) {
  const steps = Math.ceil(Math.hypot(moveX, moveZ) / MAX_STEP);
  for (let i = 0; i < steps; i += 1) {
    const next = takeStep(position, moveX / steps, moveZ / steps, walls, radius);
    if (!next) return;
    position.x = next.x;
    position.z = next.z;
  }
}
