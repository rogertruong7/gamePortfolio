import React, { useEffect, useRef, useState } from "react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Define a constant for the camera's offset from the player position
const CAMERA_OFFSET = new THREE.Vector3(150, 100, 150);
// Define a constant for controlling the camera's rotation speed
const CAMERA_ROTATION_SPEED = 0.0008;

const MainCamera = React.forwardRef(({ playerPos }, ref) => {
  // State to track the aspect ratio of the screen (width/height)
  const [aspect, setAspect] = useState(window.innerWidth / window.innerHeight);
    const [currentRotation, setCurrentRotation] = useState(
      new THREE.Vector2(0, 0)
    );
    const [isDragging, setIsDragging] = useState(false);
    const previousMousePosition = useRef({ x: 0, y: 0 });

  // Effect hook to handle window resize and update the aspect ratio
  useEffect(() => {
    const handleResize = () => {
      setAspect(window.innerWidth / window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect hook to handle mouse interactions (down, up, leave, move)
  useEffect(() => {
    const onMouseDown = (event) => {
      setIsDragging(true);
      previousMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    const onMouseLeave = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    const onMouseMove = (event) => {
      // Calculate the change in mouse position
      const deltaX = event.clientX - previousMousePosition.current.x;
      const deltaY = event.clientY - previousMousePosition.current.y;

      if (isDragging) {
        // Update the rotation based on mouse movement while dragging
        setCurrentRotation((prevRotation) => {
          const newRotation = new THREE.Vector2(
            prevRotation.x - deltaY * CAMERA_ROTATION_SPEED,
            prevRotation.y - deltaX * CAMERA_ROTATION_SPEED
          );

          // Limit vertical rotation to avoid flipping the camera
          newRotation.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, newRotation.x)
          );

          return newRotation;
        });
      } else {
        // Update the rotation even when not dragging (slower adjustment)
        setCurrentRotation((prevRotation) => {
          const newRotation = new THREE.Vector2(
            prevRotation.x - deltaY * 0.00005,
            prevRotation.y - deltaX * 0.00005
          );
          return newRotation;
        });
      }

      // Update the previous mouse position for the next move
      previousMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    // Attach event listeners for mouse actions
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mousemove", onMouseMove);

    // Cleanup event listeners when the component unmounts
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [isDragging]);

  // Function to update the camera's position and rotation
  function updateCamera() {
    // Get the camera reference
    let camera = ref.current;

    // Create a quaternion for the camera's rotation based on current rotation angles
    const rotationQuat = new THREE.Quaternion();
    rotationQuat.setFromEuler(
      new THREE.Euler(currentRotation.x, currentRotation.y, 0, "YXZ")
    );

    // Calculate the camera's offset based on the rotation
    const cameraOffset = new THREE.Vector3(
      CAMERA_OFFSET.x,
      CAMERA_OFFSET.y,
      CAMERA_OFFSET.z
    );
    cameraOffset.applyQuaternion(rotationQuat); // Apply the rotation to the offset

    // Prevent the camera from going too low (adjust minimum height)
    if (cameraOffset.y < 10) {
      cameraOffset.y = 10;
    }

    // Calculate the target camera position by adding the offset to the player's position
    const targetPosition = playerPos.clone().add(cameraOffset);

    // Smoothly interpolate the camera position towards the target position
    camera.position.lerp(targetPosition, 0.1);

    // Ensure the camera is always looking at the player
    camera.lookAt(playerPos);
  }

  // Update the camera position and rotation every frame
  useFrame(() => {
    if (ref.current) {
      updateCamera();
    }
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        ref={ref}
        position={CAMERA_OFFSET} // Set initial camera position relative to playerPos
        fov={60} // Field of view for the camera
        aspect={aspect} // Aspect ratio based on window size
        near={0.1} // Near clipping plane for rendering
        far={1000} // Far clipping plane for rendering
      />
    </>
  );
});

export default MainCamera;
