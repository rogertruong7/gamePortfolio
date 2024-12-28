import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const CAMERA_OFFSET = new THREE.Vector3(160, 120, 160);
const SPEED = 0.8;
const startPosition = [93, -8, -134];

const Lights = () => (
  <>
    <directionalLight
      color={0xf5d1ab}
      intensity={2}
      position={[300, 300, 300]}
      castShadow
      shadow-camera-near={0.5}
      shadow-camera-far={1200}
      shadow-camera-left={-400}
      shadow-camera-right={400}
      shadow-camera-top={400}
      shadow-camera-bottom={-400}
    />
    <ambientLight color={0xffffff} intensity={0.5} />
  </>
);

const Character = ({ position }) => {
  const ref = useRef();
  const { scene, animations } = useGLTF("models/cloudme.glb");
  const { clock } = useThree();
  const mixer = new THREE.AnimationMixer(scene);

  useEffect(() => {
    if (animations.length > 0) {
      const action = mixer.clipAction(animations[0]);
      action.setLoop(THREE.LoopRepeat);
      action.play();
    }

    return () => mixer.stopAllAction();
  }, [animations, mixer]);

  useFrame(() => mixer.update(clock.getDelta()));

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
};

const Floor = () => {
  const { scene } = useGLTF("models/floor.glb");

  useEffect(() => {
    scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive object={scene} scale={[0.3, 0.3, 0.3]} position={[0, 0, 0]} />
  );
};

const TextLabels = ({ labels }) => {
  return labels.map(({ text, position, fontSize }, index) => (
    <Text
      key={index}
      position={position}
      fontSize={fontSize}
      color="white"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  ));
};

const CameraControls = ({ characterRef }) => {
  const { camera } = useThree();

  useFrame(() => {
    if (characterRef.current) {
      const targetPosition = characterRef.current.position
        .clone()
        .add(CAMERA_OFFSET);
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(characterRef.current.position);
    }
  });

  return null;
};

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
