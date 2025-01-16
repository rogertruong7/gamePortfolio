import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { invisWalls } from "./BorderWalls";

const SPEED = 0.6;

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

    function clickToMove() {
      if (clickMoving && ref.current !== undefined) {
        let character = ref.current;
        const movingDirection = targetPosition.clone().sub(character.position);
        movingDirection.y = 0;
        // If the distance to target is large enough, move the character
        if (movingDirection.length() > SPEED) {
          const stepDirection = movingDirection
            .normalize()
            .multiplyScalar(SPEED); // Step size

          // Check if the next step leads to a collision
          const newPosition = character.position.clone().add(stepDirection);
          const result = isCollision(newPosition);
          if (!result) {
            // No collision, move the character
            character.position.add(stepDirection);
            updateRotation(stepDirection);
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
    function updateRotation(inputVector) {
      if (inputVector.length() > 0) {
        // Normalize the input vector and store the last valid direction
        inputVector.normalize();
        lastDirection.copy(inputVector);

        // Calculate the target angle based on the input vector
        const targetAngle =
          Math.atan2(inputVector.x, inputVector.z) - Math.PI / 2; // Angle in radians

        // Smoothly interpolate the character's current rotation to the target angle
        const currentAngle = ref.current.rotation.y; // Current Y-axis rotation
        const newAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, 1);

        // Apply the new angle
        ref.current.rotation.y = newAngle;
      }
    }

    function keyboardMovement() {
      localStorage.setItem("visited", true);
      let direction = new THREE.Vector3();
      let finalDirection = new THREE.Vector3();
      if (localStorage.getItem("visited") === "true") {
        if (keys["w"] || keys["arrowup"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);

          direction.y = 0;
          direction = direction.normalize();
          finalDirection.add(direction);
        }
        if (keys["s"] || keys["arrowdown"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);

          direction.y = 0;
          direction = direction.normalize().negate();
          finalDirection.add(direction);
        }
        if (keys["a"] || keys["arrowleft"]) {
          setDarkspot(false);
          setClickMoving(false);
          cameraRef.current.getWorldDirection(direction);

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

    function keyboardMovingSlide(finalDirection) {
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

        updateRotation(finalDirection);
        if (!collisionNormal) {
          character.position.addScaledVector(finalDirection, SPEED);
        } else {
          // Slide along the wall using the collision normal
          const slideDirection = finalDirection
            .clone()
            .projectOnPlane(collisionNormal);

          if (slideDirection.length() > 0) {
            slideDirection.normalize();
            let slidingPosition = character.position
              .clone()
              .addScaledVector(slideDirection, SPEED);

            // Check if the new sliding position causes a collision, excluding the current sliding wall
            const collisionNormalAfterSlide = isCollision(
              slidingPosition,
              wall
            );

            if (!collisionNormalAfterSlide) {
              // If no collision, perform the slide movement
              character.position.addScaledVector(slideDirection, SPEED);
            }
          }
        }
      }
    }

    useEffect(() => {
      if (animations.length > 0) {
        console.log("Animations:", animations);

        mixer.current = new THREE.AnimationMixer(scene);
        const action = mixer.current.clipAction(animations[0]);
        console.log(mixer.current);
        action.play();
      }

      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [scene, animations]);

    useFrame(({ clock }) => {
      let delta = clock.getDelta();
      delta = Math.max(delta, 0.005);
      if (mixer.current) {
        mixer.current.update(delta);
      }
      let finalDirection = keyboardMovement();

      clickToMove();
      keyboardMovingSlide(finalDirection);
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
