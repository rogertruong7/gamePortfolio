import React, { useRef, useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { benchEdges, invisWalls, walkArea } from "./Static";
import { createPathfinder } from "./pathfinding";
import { applySitPose, findSitBones, nearestBench, updateSit } from "./sitting";
import { updateDoorWalk } from "./doorWalk";
import { applyEmotePose, findEmoteBones, updateEmote } from "./emotes";
import { applyLakePose, followGround, updateLake } from "./lake";
import { isBlocked, moveAndSlide } from "./wallSliding";
import { WALK_PLAYBACK, createWalkFeel, updateWalkFeel } from "./walkFeel";
import { setDown, updateJump } from "./jumping";
import { readStore } from "../Helpers/storage.js";

const WALLS = [
  ...invisWalls.map((wall) => ({
    closestPoint: (position) => wall.clampPoint(position, new THREE.Vector3()),
  })),
  ...benchEdges,
];
const CHARACTER_RADIUS = 5;
const pathfinder = createPathfinder({
  boxes: benchEdges,
  bounds: walkArea,
  radius: CHARACTER_RADIUS,
});
const SPEED = 100;
// A hitch moves the character no further than this much time. At 10 units it can't
// clear the hitbox's 10-unit width, so a click-to-move step can't jump a wall.
const MAX_FRAME_DELTA = 0.1;
// Idle plays the walk clip very slowly as a gentle breathing motion
const IDLE_ANIMATION_SPEED = 0.06;

const Character = React.forwardRef(
  (
    {
      position,
      cameraRef,
      setPlayerPos,
      setDarkspot,
      setClickMoving,
      clickMoving,
      targetPosition,
      keys,
      currentScene,
      sitRef,
      setSitPhase,
      setNearBench,
      doorWalkRef,
      onDoorWalkDone,
      lakeRef,
      setInWater,
      setLakePhase,
      setFlipped,
      emoteRef,
      jumpRef,
    },
    ref
  ) => {
    const { scene, animations } = useGLTF("/models/cloudme.glb");
    const [arrowMoving, setArrowMoving] = useState(false);
    const mixer = useRef();
    const walkAction = useRef(null);
    const walkFeel = useMemo(
      () => (animations.length > 0 ? createWalkFeel(scene, animations[0]) : null),
      [scene, animations]
    );
    const sitBones = useMemo(() => findSitBones(scene), [scene]);
    const headBone = useMemo(() => scene.getObjectByName("Head_210_015"), [scene]);
    const emoteBones = useMemo(() => findEmoteBones(scene), [scene]);
    const clickRoute = useRef({ target: null, stops: [], next: 0 });

    function clickToMove(delta) {
      if (clickMoving && ref.current !== undefined) {
        let character = ref.current;

        // A new click is a new target object, so that's the time to plan a new route
        if (clickRoute.current.target !== targetPosition) {
          clickRoute.current = {
            target: targetPosition,
            stops: pathfinder.findPath(character.position, targetPosition),
            next: 0,
          };
        }
        const route = clickRoute.current;
        // Arriving only asks React to stop the walk, so a frame can run before it has
        const stop = route.stops[route.next];
        if (!stop) return;

        const movingDirection = new THREE.Vector3(
          stop.x - character.position.x,
          0,
          stop.z - character.position.z
        );
        // If the distance to the next stop is large enough, move the character
        if (movingDirection.length() > delta * SPEED) {
          const stepDirection = movingDirection
            .normalize()
            .multiplyScalar(delta * SPEED); // Step size

          // Check if the next step leads to a collision
          const newPosition = character.position.clone().add(stepDirection);
          if (!isBlocked(character.position, newPosition, WALLS, CHARACTER_RADIUS)) {
            // No collision, move the character
            character.position.add(stepDirection);
            updateRotation(stepDirection, delta);
          } else {
            setDarkspot(false);
            setClickMoving(false);
          }
        } else {
          // Land exactly on it, or the line to the next stop could clip the corner
          character.position.x = stop.x;
          character.position.z = stop.z;
          route.next += 1;
          if (route.next === route.stops.length) {
            setDarkspot(false);
            setClickMoving(false);
          }
        }
      }
    }

    let lastDirection = new THREE.Vector3(0, 0, 1);
    function updateRotation(inputVector, delta) {
      if (inputVector.length() > 0) {
        // Normalize the input vector and store the last valid direction
        inputVector.normalize();
        lastDirection.copy(inputVector);

        // Calculate the target angle based on the input vector
        let targetAngle =
          Math.atan2(inputVector.x, inputVector.z) - Math.PI / 2;
        // Correct for your custom orientation
        targetAngle += Math.PI / 4; // Offset adjustment for custom direction setup

        // Get the current angle of rotation and adjust for custom orientation
        let currentAngle = ref.current.rotation.y + Math.PI / 4;

        // Normalize both angles to the range [-PI, PI]
        targetAngle =
          THREE.MathUtils.euclideanModulo(targetAngle + Math.PI, 2 * Math.PI) -
          Math.PI;
        currentAngle =
          THREE.MathUtils.euclideanModulo(currentAngle + Math.PI, 2 * Math.PI) -
          Math.PI;

        // Calculate the shortest angle difference
        let angleDifference = targetAngle - currentAngle;
        if (angleDifference > Math.PI) {
          angleDifference -= 2 * Math.PI;
        } else if (angleDifference < -Math.PI) {
          angleDifference += 2 * Math.PI;
        }

        // Eases towards the target angle, without overshooting it on a slow frame
        const smoothFactor = 1 - Math.exp(-13 * delta);
        const newAngle = currentAngle + angleDifference * smoothFactor;
        // Apply the new angle back, removing the offset adjustment
        ref.current.rotation.y = newAngle - Math.PI / 4;
      }
    }

    useEffect(() => {
      if (Object.values(keys).every(key => key === false)) {
        setArrowMoving(false);
        // console.log('not arrow moving');
      }
    }, [keys]);

    function keyboardMovement() {
      let direction = new THREE.Vector3();
      let finalDirection = new THREE.Vector3();
      if (readStore("visited") === "true") {
        if (keys["w"] || keys["arrowup"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);
          setArrowMoving(true);
          direction.y = 0;
          direction = direction.normalize();
          finalDirection.add(direction);
        }
        if (keys["s"] || keys["arrowdown"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);
          setArrowMoving(true);
          direction.y = 0;
          direction = direction.normalize().negate();
          finalDirection.add(direction);
        }
        if (keys["a"] || keys["arrowleft"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);
          setArrowMoving(true);
          direction.y = 0;
          direction = new THREE.Vector3(
            direction.z,
            0,
            -direction.x
          ).normalize();
          finalDirection.add(direction);
        }
        if (keys["d"] || keys["arrowright"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);
          setArrowMoving(true);
          direction.y = 0;
          direction = new THREE.Vector3(
            -direction.z,
            0,
            direction.x
          ).normalize();
          finalDirection.add(direction);
        }
      }
      return finalDirection;
    }

    function keyboardMovingSlide(finalDirection, delta) {
      if (!ref.current || finalDirection.lengthSq() === 0) return;

      // This also normalizes finalDirection, so diagonals aren't any faster
      updateRotation(finalDirection, delta);
      moveAndSlide(
        ref.current.position,
        finalDirection.x * delta * SPEED,
        finalDirection.z * delta * SPEED,
        WALLS,
        CHARACTER_RADIUS
      );
    }

    useEffect(() => {
      if (animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);
        walkAction.current = mixer.current.clipAction(animations[0]);
        walkAction.current.play();
      }

      scene.traverse((child) => {
        if (child.isMesh) {
          // The town's shadows are only drawn once, so the character would leave a
          // frozen shadow at its start spot. PlayerShadow draws its shadow instead.
          child.castShadow = false;
          child.receiveShadow = true;
        }
      });
    }, [scene, animations]);

    useFrame(({ clock }, delta) => {
      const sit = sitRef.current;
      const doorWalk = doorWalkRef.current;
      const lake = lakeRef.current;
      const moving =
        doorWalk !== null ||
        (sit.phase === "none"
          ? lake.phase === "none" && (clickMoving || arrowMoving)
          : sit.phase === "approaching");

      if (mixer.current) {
        // The clip speeds up and slows down with the walk instead of snapping between speeds
        const weight = walkFeel ? walkFeel.weight : moving ? 1 : 0;
        mixer.current.update(delta * THREE.MathUtils.lerp(IDLE_ANIMATION_SPEED, WALK_PLAYBACK, weight));
      }
      if (walkFeel && walkAction.current && ref.current) {
        updateWalkFeel(walkFeel, {
          moving,
          delta,
          clipTime: walkAction.current.time,
          yaw: ref.current.rotation.y,
        });
      }
      applySitPose(sit, sitBones, clock.elapsedTime);
      applyLakePose(lake, headBone);
      applyEmotePose(emoteRef.current, emoteBones);

      if (currentScene !== 0) return;

      const jump = jumpRef.current;
      setDown(jump, ref.current);
      const moveDelta = Math.min(delta, MAX_FRAME_DELTA);
      let finalDirection = keyboardMovement();
      // The picture is upside down, so going up the screen means walking back towards the camera
      if (lake.flipped) finalDirection.negate();
      const lakeMovesCharacter = updateLake(
        lake,
        ref.current,
        delta,
        finalDirection.lengthSq() > 0,
        updateRotation
      );
      updateEmote(
        emoteRef.current,
        delta,
        finalDirection.lengthSq() > 0 ||
          clickMoving ||
          jump.airborne ||
          jump.requested ||
          doorWalk !== null ||
          lake.phase !== "none" ||
          sit.phase !== "none",
        ref.current,
        cameraRef.current,
        updateRotation
      );

      if (doorWalk) {
        if (!doorWalk.finished && updateDoorWalk(doorWalk, ref.current, delta, updateRotation)) {
          onDoorWalkDone(doorWalk);
        }
      } else if (lakeMovesCharacter) {
        // The lake has moved it already
      } else if (sit.phase === "none") {
        clickToMove(moveDelta);
        keyboardMovingSlide(finalDirection, moveDelta);
        followGround(lake, ref.current, moveDelta);
      } else {
        const wantsToMove =
          finalDirection.lengthSq() > 0 || targetPosition !== sit.clickTarget;
        updateSit(sit, ref.current, delta, wantsToMove, updateRotation);
      }

      // Only a hop from the ground, never while sitting, in the pond or walking through a door
      const canJump = sit.phase === "none" && lake.phase === "none" && !doorWalk;
      updateJump(jump, ref.current, moveDelta, canJump);

      if (ref.current !== undefined) {
        setPlayerPos(ref.current.position);

        const near = nearestBench(ref.current.position);
        if (near !== sit.near) {
          sit.near = near;
          setNearBench(near);
        }

        const { x, z } = ref.current.position;
        lake.inWater =
          sit.phase === "none" && !doorWalk && lake.ground !== null && lake.ground.isWater(x, z);
        setInWater(lake.inWater);
      }
      setSitPhase(sit.phase);
      setLakePhase(lake.phase);
      setFlipped(lake.flipped);
    });

    return (
      <primitive
        ref={ref}
        object={scene}
        position={position}
        scale={[0.08, 0.08, 0.08]}
        rotation={[0, -Math.PI / 4, 0]}
        castShadow
        receiveShadow
      />
    );
  }
);

export default Character;
