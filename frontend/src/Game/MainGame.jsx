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
import Doorway from "./Doorway.jsx";

let startPosition = [93, -8, -134];
let targetPosition = new THREE.Vector3(...startPosition);
let mouseDownTime = 0; // Time when mouse is pressed down
const CLICK_THRESHOLD = 150; // Time in milliseconds to consider it a short click (e.g., 300ms)

function MainGame({
  setLoading,
  setCurrentScene,
  setEnterPopupVisible,
  setProjectButton,
  setAboutButton,
  setExperiencesButton,
  setSkillsButton,
  setTwoOptionsButton,
  setOneOptionButton,
}) {
  const characterRef = useRef();
  const cameraRef = useRef();
  const floorRef = useRef();
  const leftBuildingRef = useRef();
  const rightBuildingRef = useRef();

  const labels = [
    { text: "projects", position: [38, 90, -90], fontSize: 10 },
    { text: "about me", position: [38, 70, -164], fontSize: 10 },
    { text: "experiences", position: [92, 75, -210], fontSize: 8 },
    { text: "skills", position: [170, 75, -210], fontSize: 10 },
  ];

  const showcases = [
    {
      showcaseName: "projects",
      boxMin: new THREE.Vector3(105, -50, 132),
      boxMax: new THREE.Vector3(188, 50, 408),
    },
    {
      showcaseName: "aboutMe",
      boxMin: new THREE.Vector3(105, -50, -46),
      boxMax: new THREE.Vector3(188, 50, 86),
    },
    {
      showcaseName: "experiences",
      boxMin: new THREE.Vector3(117, -50, -60),
      boxMax: new THREE.Vector3(292, 50, 20),
    },
    {
      showcaseName: "skills",
      boxMin: new THREE.Vector3(365, -50, -60),
      boxMax: new THREE.Vector3(504, 50, 20),
    },
  ];

  let startVector = new THREE.Vector3(...startPosition);

  const [playerPos, setPlayerPos] = useState(startVector);
  const [clickMoving, setClickMoving] = useState(false);
  const [darkSpot, setDarkspot] = useState(false);
  const [darkSpotPos, setDarkspotPos] = useState("");

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
    if (floorRef.current) {
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
    <>
      <Canvas id="gameCanvas" shadows>
        <RendererSettings />
        <ResizeHandler />
        <MainCamera ref={cameraRef} playerPos={playerPos} />
        <Lights />
        <Floor ref={floorRef} />
        <Buildings setLoading={setLoading} />
        <Details />
        <Character
          ref={characterRef}
          position={startPosition}
          cameraRef={cameraRef}
          setPlayerPos={setPlayerPos}
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
        {darkSpot && <DarkSpot darkSpotPos={darkSpotPos} />}
        {showcases.map(({ showcaseName, boxMin, boxMax }, index) => (
          <Doorway
            key={index}
            boxMin={boxMin}
            boxMax={boxMax}
            showcaseName={showcaseName}
            playerPos={playerPos}
            setEnterPopupVisible={setEnterPopupVisible}
            setProjectButton={setProjectButton}
            setAboutButton={setAboutButton}
            setExperiencesButton={setExperiencesButton}
            setSkillsButton={setSkillsButton}
            setTwoOptionsButton={setTwoOptionsButton}
            setOneOptionButton={setOneOptionButton}
          />
        ))}
      </Canvas>
    </>
  );
}

export default MainGame;
