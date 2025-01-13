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

function Game() {
  const characterRef = useRef();
  const [currentScene, setCurrentScene] = useState(new THREE.Scene());
  const [labels] = useState([
    { text: "projects", position: [38, 90, -90], fontSize: 10 },
    { text: "about me", position: [38, 70, -164], fontSize: 10 },
    { text: "experiences", position: [92, 75, -210], fontSize: 8 },
    { text: "skills", position: [170, 75, -210], fontSize: 10 },
  ]);

  return (
    <>
      <Canvas
        shadows
        camera={{
          position: [CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z],
          fov: 60,
        }}
      >
        <Lights />
        <Floor />
        <Buildings />
        <Details />
        <Character ref={characterRef} position={startPosition} />
        {labels.map(({ text, position, fontSize }, index) => (
          <Text
            key={index}
            text={text}
            position={[position.x, position.y, position.z]}
            fontPath="/path/to/font.json"
            fontSize={fontSize}
            color="white"
          />
        ))}
        <Camera1 characterRef={characterRef} />
      </Canvas>
    </>
  );
}

export default Game;
