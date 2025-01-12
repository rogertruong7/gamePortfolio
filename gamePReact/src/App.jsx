import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

import { Game } from "./Game.jsx";

const startPosition = [93, -8, -134];

const Game = () => {
  const characterRef = useRef();
  const [labels] = useState([
    { text: "projects", position: [38, 90, -90], fontSize: 10 },
    { text: "about me", position: [38, 70, -164], fontSize: 10 },
    { text: "experiences", position: [92, 75, -210], fontSize: 8 },
    { text: "skills", position: [170, 75, -210], fontSize: 10 },
  ]);

  return (
    <Canvas
      shadows
      camera={{
        position: [CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z],
        fov: 60,
      }}
    >
      <Lights />
      <Floor />
      <Character ref={characterRef} position={startPosition} />
      <TextLabels labels={labels} />
      <CameraControls characterRef={characterRef} />
      <OrbitControls />
    </Canvas>
  );
};

const App = () => {
  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <Game />
      <button
        onClick={() => window.location.reload()}
        style={{ position: "absolute", top: 10, left: 10 }}
      >
        Reset
      </button>
    </div>
  );
};

export default App;
