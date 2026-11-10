// Finds a way around the hitboxes with a visibility graph. The shortest way around a box
// always bends at its corners, so those corners are the only places worth stopping at. The
// graph joins every pair of corners with a clear straight line between them, once up front,
// and each click searches it with A*. The map has few enough boxes for that to be instant.

// Stops sit a little further out than lines are allowed to pass, so a line between two
// corners of the same box still counts as clear. Both leave the character some room, since
// its own collision would otherwise stop it dead on a corner.
const STOP_CLEARANCE = 0.25;
const LINE_CLEARANCE = 0.1;
const MAX_PUSHES = 8;

function toBoxSpace(box, point) {
  const dx = point.x - box.cx;
  const dz = point.z - box.cz;
  return { u: dx * box.cos + dz * box.sin, v: -dx * box.sin + dz * box.cos };
}

function fromBoxSpace(box, u, v) {
  return {
    x: box.cx + u * box.cos - v * box.sin,
    z: box.cz + u * box.sin + v * box.cos,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// How far along the line from a to b it enters the box, from 0 to 1, or null if it misses
function lineEntersBox(box, a, b, padding) {
  const start = toBoxSpace(box, a);
  const end = toBoxSpace(box, b);
  let enter = 0;
  let exit = 1;

  const axes = [
    [start.u, end.u, box.halfW + padding],
    [start.v, end.v, box.halfD + padding],
  ];
  for (const [from, to, half] of axes) {
    const change = to - from;
    if (Math.abs(change) < 1e-9) {
      if (Math.abs(from) > half) return null;
    } else {
      const first = (-half - from) / change;
      const second = (half - from) / change;
      enter = Math.max(enter, Math.min(first, second));
      exit = Math.min(exit, Math.max(first, second));
      if (enter > exit) return null;
    }
  }
  return enter;
}

export function createPathfinder({ boxes, bounds, radius }) {
  const stopPadding = radius + STOP_CLEARANCE;
  const linePadding = radius + LINE_CLEARANCE;

  const minX = bounds.minX + stopPadding;
  const maxX = bounds.maxX - stopPadding;
  const minZ = bounds.minZ + stopPadding;
  const maxZ = bounds.maxZ - stopPadding;

  function isInside(box, point) {
    const { u, v } = toBoxSpace(box, point);
    return Math.abs(u) < box.halfW + linePadding && Math.abs(v) < box.halfD + linePadding;
  }

  function isClear(a, b) {
    return boxes.every((box) => lineEntersBox(box, a, b, linePadding) === null);
  }

  function clampToMap(point) {
    return {
      x: Math.min(maxX, Math.max(minX, point.x)),
      z: Math.min(maxZ, Math.max(minZ, point.z)),
    };
  }

  // The spot closest to this one that isn't past the map's edge or too close to a box. A box
  // can be left by any side, so it picks the best one on the way from `comingFrom`. There's
  // more than one push because getting out of one box can land in the next.
  function nearestOpenSpot(point, comingFrom) {
    let spot = clampToMap(point);
    for (let push = 0; push < MAX_PUSHES; push += 1) {
      const box = boxes.find((candidate) => isInside(candidate, spot));
      if (!box) break;

      const { u, v } = toBoxSpace(box, spot);
      const sideU = box.halfW + stopPadding;
      const sideV = box.halfD + stopPadding;
      const detour = (side) => distance(side, spot) + distance(side, comingFrom);
      const best = [
        fromBoxSpace(box, sideU, v),
        fromBoxSpace(box, -sideU, v),
        fromBoxSpace(box, u, sideV),
        fromBoxSpace(box, u, -sideV),
      ].reduce((a, b) => (detour(b) < detour(a) ? b : a));
      spot = clampToMap(best);
    }
    return spot;
  }

  const corners = boxes
    .flatMap((box) => {
      const u = box.halfW + stopPadding;
      const v = box.halfD + stopPadding;
      return [
        fromBoxSpace(box, u, v),
        fromBoxSpace(box, u, -v),
        fromBoxSpace(box, -u, v),
        fromBoxSpace(box, -u, -v),
      ];
    })
    .filter(
      (corner) =>
        corner.x >= minX &&
        corner.x <= maxX &&
        corner.z >= minZ &&
        corner.z <= maxZ &&
        !boxes.some((box) => isInside(box, corner))
    );

  const neighbours = corners.map(() => []);
  corners.forEach((a, i) => {
    for (let j = i + 1; j < corners.length; j += 1) {
      if (isClear(a, corners[j])) {
        const length = distance(a, corners[j]);
        neighbours[i].push({ corner: j, length });
        neighbours[j].push({ corner: i, length });
      }
    }
  });

  // A*, with the start and goal joined on for this one search. Returns the corners to pass
  // through, or null if the goal can't be reached from the start at all.
  function searchCorners(start, goal) {
    const cost = corners.map(() => Infinity);
    const cameFrom = corners.map(() => null);
    const open = new Set();
    corners.forEach((corner, i) => {
      if (isClear(start, corner)) {
        cost[i] = distance(start, corner);
        open.add(i);
      }
    });

    let bestTotal = Infinity;
    let lastCorner = null;

    while (open.size > 0) {
      let current = null;
      let currentEstimate = Infinity;
      open.forEach((i) => {
        const estimate = cost[i] + distance(corners[i], goal);
        if (estimate < currentEstimate) {
          current = i;
          currentEstimate = estimate;
        }
      });
      if (currentEstimate >= bestTotal) break;
      open.delete(current);

      if (isClear(corners[current], goal)) {
        const total = cost[current] + distance(corners[current], goal);
        if (total < bestTotal) {
          bestTotal = total;
          lastCorner = current;
        }
      }

      for (const { corner, length } of neighbours[current]) {
        if (cost[current] + length < cost[corner]) {
          cost[corner] = cost[current] + length;
          cameFrom[corner] = current;
          open.add(corner);
        }
      }
    }

    if (lastCorner === null) return null;
    const route = [];
    for (let i = lastCorner; i !== null; i = cameFrom[i]) route.unshift(corners[i]);
    return route;
  }

  // The goal is somewhere walled off, so walk straight at it until something's in the way
  function lastClearSpot(start, goal) {
    const enter = Math.min(
      ...boxes.map((box) => lineEntersBox(box, start, goal, linePadding) ?? 1)
    );
    return {
      x: start.x + (goal.x - start.x) * enter,
      z: start.z + (goal.z - start.z) * enter,
    };
  }

  function findPath(from, to) {
    const start = nearestOpenSpot(from, from);
    const goal = nearestOpenSpot(to, from);
    // Sliding along a wall can leave the character closer than a line is allowed to pass
    const stops = distance(from, start) > 1e-6 ? [start] : [];

    if (isClear(start, goal)) return [...stops, goal];
    const route = searchCorners(start, goal);
    if (route) return [...stops, ...route, goal];
    return [...stops, lastClearSpot(start, goal)];
  }

  return { findPath };
}
