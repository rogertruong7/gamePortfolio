import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Lights from "./Lighting.jsx";
import Camera1 from "./Camera1.jsx";
import Character from "./Character.jsx";
import Floor from "./Floor.jsx";
import Buildings from "./Buildings.jsx";
import Text from "./Text.jsx";
import Details from "./Details.jsx";

export const CAMERA_OFFSET = new THREE.Vector3(160, 120, 160);
let startPosition = [93, -8, -134];

function ResizeHandler() {
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

function Game() {
  const characterRef = useRef();
  const cameraRef = useRef();

  const [currentScene, setCurrentScene] = useState(0);
  const [labels] = useState([
    { text: "projects", position: [38, 90, -90], fontSize: 10 },
    { text: "about me", position: [38, 70, -164], fontSize: 10 },
    { text: "experiences", position: [92, 75, -210], fontSize: 8 },
    { text: "skills", position: [170, 75, -210], fontSize: 10 },
  ]);

  return (
    <>
      {currentScene === 0 ? (
        <Canvas
        shadows
        camera={{
          position: [CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z],
          fov: 80,
        }}
      >
        <RendererSettings />
        <Lights />
        <Floor />
        {/* <Buildings /> */}
        {/* <Details /> */}
        <Character ref={characterRef} position={startPosition} />
        {labels.map(({ text, position, fontSize }, index) => (
          <Text
            key={index}
            text={text}
            position={[position.x, position.y, position.z]}
            fontPath="fonts/PixelifySans_Regular.json"
            fontSize={fontSize}
            color="white"
          />
        ))}
        {/* <Camera1 characterRef={characterRef} /> */}
        <ResizeHandler />
      </Canvas>
      ) : (
        <h1>Hello</h1>
      )}
    </>
  );
}

export default Game;
