import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Lights from "./Lights.jsx";
import MainCamera from "./MainCamera.jsx";
import Character from "./Character.jsx";
import Floor from "./Floor.jsx";
import Buildings from "./Buildings.jsx";
import Text from "./Text.jsx";
import Details from "./Details.jsx";
import DarkSpot from "./Darkspot.jsx";

export const CAMERA_OFFSET = new THREE.Vector3(160, 120, 160);

let startPosition = [93, -8, -134];
let targetPosition = new THREE.Vector3(...startPosition);
let mouseDownTime = 0; // Time when mouse is pressed down
const CLICK_THRESHOLD = 150; // Time in milliseconds to consider it a short click (e.g., 300ms)

function ResizeHandler() {
  // gl is renderer
  const { gl } = useThree();
  useEffect(() => {
    const handleResize = () => {
      gl.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gl]);

  return null;
}

function RendererSettings() {
  const { gl } = useThree();
  useEffect(() => {
    // Set clear color
    gl.setClearColor(0xfad998, 1);

    // Enable shadows
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set pixel ratio for better rendering on high-DPI screens
    gl.setPixelRatio(window.devicePixelRatio);
  }, [gl]);

  return null;
}

function MainGame({ setLoading }) {
  const characterRef = useRef();
  const cameraRef = useRef();
  const floorRef = useRef();
  const leftBuildingRef = useRef();
  const rightBuildingRef = useRef();

  const [labels] = useState([
    { text: "projects", position: [38, 90, -90], fontSize: 10 },
    { text: "about me", position: [38, 70, -164], fontSize: 10 },
    { text: "experiences", position: [92, 75, -210], fontSize: 8 },
    { text: "skills", position: [170, 75, -210], fontSize: 10 },
  ]);
  let startVector = new THREE.Vector3(...startPosition);

  const [cameraPos, setCameraPos] = useState(startVector);
  const [clickMoving, setClickMoving] = useState(false);
  const [darkSpot, setDarkspot] = useState(false);
  const [darkSpotPos, setDarkspotPos] = useState("");

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
    if (floorRef.current !== undefined) {
      setDarkspot(false);
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObject(floorRef.current);
      if (intersects.length > 0 && intersects[0].point.y > -25) {
        console.log("Mouse clicked on ", intersects[0].point);
        targetPosition.copy(intersects[0].point);
        targetPosition.y = 20; // Match character height
        setClickMoving(true);

        // TODO: createDarkSpot(intersects[0].point);
        setDarkspot(true);
        setDarkspotPos(intersects[0].point)
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
    <>
      <Canvas id="gameCanvas" shadows>
        <MainCamera ref={cameraRef} cameraPos={cameraPos} />
        <RendererSettings />
        <Lights />
        <Floor ref={floorRef} />
        <Buildings setLoading={setLoading} />
        <Details />
        <Character
          ref={characterRef}
          position={startPosition}
          cameraRef={cameraRef}
          setCameraPos={setCameraPos}
          setDarkspot={setDarkspot}
          setClickMoving={setClickMoving}
          clickMoving={clickMoving}
          targetPosition={targetPosition}
        />
        {labels.map(({ text, position, fontSize }, index) => (
          <Text
            key={index}
            text={text}
            position={[position[0], position[1], position[2]]}
            fontPath="fonts/PixelifySans_Regular.json"
            fontSize={fontSize}
            color="#e67ae2"
            cameraRef={cameraRef}
          />
        ))}
        {darkSpot && (
          <>
            <DarkSpot darkSpotPos={darkSpotPos}/>
          </>
        )}
        {/* <Camera1 characterRef={characterRef} /> */}
        <ResizeHandler />
      </Canvas>
    </>
  );
}

export default MainGame;
