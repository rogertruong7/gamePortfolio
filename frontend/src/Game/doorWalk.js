import * as THREE from "three";
import { doorRoutes } from "./Static";

// It jogs over to the door like it does around town, then slows down for the climb
const JOG_SPEED = 100;
const CLIMB_SPEED = 38;

const _direction = new THREE.Vector3();

function beginStop(walk, from) {
  const stop = walk.stops[walk.stop];
  walk.from.copy(from);
  walk.to.set(stop[0], stop[1], stop[2]);
  walk.hop = stop[3] ?? 0;
  walk.length = walk.from.distanceTo(walk.to);
  walk.travelled = 0;
}

function createWalk(scene, stops, leaving, position) {
  const walk = {
    scene,
    stops,
    leaving,
    finished: false,
    stop: 0,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    hop: 0,
    length: 0,
    travelled: 0,
  };
  beginStop(walk, position);
  return walk;
}

export function startWalkingIn(scene, position) {
  return createWalk(scene, doorRoutes[scene], false, position);
}

// The same route backwards, starting from where the walk in ended, inside the building
export function startWalkingOut(scene, character) {
  const route = doorRoutes[scene];
  const stops = [];
  for (let i = route.length - 2; i >= 0; i -= 1) {
    const [x, y, z] = route[i];
    stops.push([x, y, z, route[i + 1][3] ?? 0]);
  }
  const walk = createWalk(scene, stops, true, character.position);

  // It turns around while it's still out of sight
  _direction.subVectors(walk.to, walk.from);
  character.rotation.y = Math.atan2(_direction.x, _direction.z) - Math.PI / 2;
  return walk;
}

// Returns true once the walk is over.
// turnTowards turns the character to face the way it's going.
export function updateDoorWalk(walk, character, delta, turnTowards) {
  const jogging = !walk.leaving && walk.stop === 0;
  walk.travelled += (jogging ? JOG_SPEED : CLIMB_SPEED) * delta;
  const progress = walk.length > 0 ? Math.min(1, walk.travelled / walk.length) : 1;

  character.position.lerpVectors(walk.from, walk.to, progress);
  character.position.y += Math.sin(Math.PI * progress) * walk.hop;

  _direction.subVectors(walk.to, walk.from).setY(0);
  turnTowards(_direction, delta);

  if (progress < 1) return false;
  walk.stop += 1;
  if (walk.stop === walk.stops.length) return true;
  beginStop(walk, walk.to);
  return false;
}
