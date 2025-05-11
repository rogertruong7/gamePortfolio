import React, { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const Floor = React.forwardRef(({
  setDarkspot,
  setClickMoving,
  setDarkspotPos,
  setTargetPosition,
  cameraRef
}, ref) => {
  const { scene } = useGLTF("/models/floor.glb");
  let mouseDownTime = 0; 
  const CLICK_THRESHOLD = 150; 

  useEffect(() => {
    scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
  }, [scene]);

  function onMouseDown() {
    mouseDownTime = Date.now(); // Record the time when the mouse is pressed
  }

  function onMouseUp(event) {
    const clickDuration = Date.now() - mouseDownTime; // Calculate how long the button was held down

    if (clickDuration < CLICK_THRESHOLD) {
      // If the click was short, set moving to true
      onMouseClick(event); // Call your click handler function to move the character
    }
  }

  function onMouseClick(event) {
    if (ref.current && cameraRef.current) {

      setDarkspot(false);
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      let newTargetPos = new THREE.Vector3();
      const intersects = raycaster.intersectObject(ref.current);
      if (intersects.length > 0 && intersects[0].point.y > -25) {
        // console.log("Mouse clicked on ", intersects[0].point);
        newTargetPos.copy(intersects[0].point);
        newTargetPos.y = 20; // Match character height
        setTargetPosition(newTargetPos);
        setClickMoving(true);
        setDarkspot(true);
        setDarkspotPos(intersects[0].point);
      }
    }
  }

  useEffect(() => {
    const canvas = document.querySelector("#gameCanvas");
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <primitive
      ref={ref}
      object={scene}
      scale={[0.3, 0.3, 0.3]}
      position={[0, 0, 0]}
      receiveShadow
    />
  );
});

export default Floor;
