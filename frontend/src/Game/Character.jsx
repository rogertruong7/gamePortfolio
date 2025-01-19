import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { invisWalls } from "./Static";

const SPEED = 100;

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
    },
    ref
  ) => {
    const { scene, animations } = useGLTF("models/cloudme.glb");
    const [arrowMoving, setArrowMoving] = useState(false);
    const mixer = useRef();

    function isCollision(newPosition, ignoreWall = null) {
      // Define character as a sphere for collision purposes
      const characterRadius = 5; // Approximate radius of the character
      const characterHitbox = new THREE.Sphere(newPosition, characterRadius);
      let collisionNormal = null;
      let collidingWall = null;

      invisWalls.forEach((wall) => {
        // Skip the wall that is passed as ignoreWall
        if (wall === ignoreWall) return;

        if (wall.intersectsSphere(characterHitbox)) {
          // Calculate the closest point on the current wall's bounding box to the character
          const closestPoint = new THREE.Vector3(
            Math.max(wall.min.x, Math.min(newPosition.x, wall.max.x)),
            Math.max(wall.min.y, Math.min(newPosition.y, wall.max.y)),
            Math.max(wall.min.z, Math.min(newPosition.z, wall.max.z))
          );
          // Calculate collision normal
          collisionNormal = new THREE.Vector3()
            .subVectors(newPosition, closestPoint)
            .normalize();

          collisionNormal.y = 0; // Flatten the normal to the XZ plane
          collidingWall = wall;
        }
      });

      if (collisionNormal) {
        return { collisionNormal, collidingWall };
      }

      return null;
    }

    function clickToMove(delta) {
      if (clickMoving && ref.current !== undefined) {
        let character = ref.current;
        const movingDirection = targetPosition.clone().sub(character.position);
        movingDirection.y = 0;
        // If the distance to target is large enough, move the character
        if (movingDirection.length() > delta * SPEED) {
          const stepDirection = movingDirection
            .normalize()
            .multiplyScalar(delta * SPEED); // Step size

          // Check if the next step leads to a collision
          const newPosition = character.position.clone().add(stepDirection);
          const result = isCollision(newPosition);
          if (!result) {
            // No collision, move the character
            character.position.add(stepDirection);
            updateRotation(stepDirection, delta);
          } else {
            setDarkspot(false);
            setClickMoving(false);
          }
        } else {
          setDarkspot(false);
          setClickMoving(false);
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

        // Smoothly interpolate the character's current rotation to the target angle
        const smoothFactor = 13 * delta; // Adjust this value for rotation speed
        const newAngle = currentAngle + angleDifference * smoothFactor;
        // Apply the new angle back, removing the offset adjustment
        ref.current.rotation.y = newAngle - Math.PI / 4;
      }
    }

    useEffect(() => {
      if (Object.values(keys).every(key => key === false)) {
        setArrowMoving(false);
        console.log('not arrow moving');
      }
    }, [keys]);

    function keyboardMovement() {
      let direction = new THREE.Vector3();
      let finalDirection = new THREE.Vector3();
      if (localStorage.getItem("visited") === "true") {
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
      if (ref.current !== undefined) {
        let character = ref.current;
        let collisionNormal = null;
        let wall = null;
        let newPosition = character.position.clone().add(finalDirection);
        const result = isCollision(newPosition);

        if (result) {
          collisionNormal = result.collisionNormal;
          wall = result.collidingWall;
        }

        updateRotation(finalDirection, delta);
        if (!collisionNormal) {
          character.position.addScaledVector(finalDirection, delta * SPEED);
        } else {
          // Slide along the wall using the collision normal
          const slideDirection = finalDirection
            .clone()
            .projectOnPlane(collisionNormal);

          if (slideDirection.length() > 0) {
            slideDirection.normalize();
            let slidingPosition = character.position
              .clone()
              .addScaledVector(slideDirection, delta * SPEED);

            // Check if the new sliding position causes a collision, excluding the current sliding wall
            const collisionNormalAfterSlide = isCollision(
              slidingPosition,
              wall
            );

            if (!collisionNormalAfterSlide) {
              // If no collision, perform the slide movement
              character.position.addScaledVector(slideDirection, delta * SPEED);
            }
          }
        }
      }
    }

    useEffect(() => {
      if (animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);
        const action = mixer.current.clipAction(animations[0]);
        action.play();
      }

      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [scene, animations]);

    useFrame(({ clock }, delta) => {
      let adjustedDelta = Math.max(clock.getDelta(), 0.001); // Ensure a minimum value for delta

      if (clickMoving || arrowMoving) {
        // Set a minimum delta value when certain conditions are met
        adjustedDelta = Math.max(delta, 0.02);
      }

      // Update the animation mixer if it exists
      if (mixer.current) {
        mixer.current.update(adjustedDelta);
      }
      let finalDirection = keyboardMovement();

      clickToMove(delta);
      keyboardMovingSlide(finalDirection, delta);
      if (ref.current !== undefined) {
        setPlayerPos(ref.current.position);
      }
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
