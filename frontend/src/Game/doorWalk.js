import * as THREE from "three";
import { doorRoutes } from "./Static";

// It jogs over to the door like it does around town, then slows down for the climb
const JOG_SPEED = 100;
const CLIMB_SPEED = 38;

const _direction = new THREE.Vector3();

function beginStop(walk, from) {
  const stop = walk.route[walk.stop];
  walk.from.copy(from);
  walk.to.set(stop[0], stop[1], stop[2]);
  walk.hop = stop[3] ?? 0;
  walk.length = walk.from.distanceTo(walk.to);
  walk.travelled = 0;
}

export function startDoorWalk(scene, position) {
  const walk = {
    scene,
    route: doorRoutes[scene],
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

// Returns true once the character is through the door.
// turnTowards turns the character to face the way it's going.
export function updateDoorWalk(walk, character, delta, turnTowards) {
  walk.travelled += (walk.stop === 0 ? JOG_SPEED : CLIMB_SPEED) * delta;
  const progress = walk.length > 0 ? Math.min(1, walk.travelled / walk.length) : 1;

  character.position.lerpVectors(walk.from, walk.to, progress);
  character.position.y += Math.sin(Math.PI * progress) * walk.hop;

  _direction.subVectors(walk.to, walk.from).setY(0);
  turnTowards(_direction, delta);

  if (progress < 1) return false;
  walk.stop += 1;
  if (walk.stop === walk.route.length) return true;
  beginStop(walk, walk.to);
  return false;
}

// While the page is showing, the character waits at the foot of the step, facing back out
export function waitOutsideDoor(walk, character) {
  const [outsideX, outsideY, outsideZ] = walk.route[0];
  const [stepX, , stepZ] = walk.route[1];
  character.position.set(outsideX, outsideY, outsideZ);
  character.rotation.y = Math.atan2(outsideX - stepX, outsideZ - stepZ) - Math.PI / 2;
}
