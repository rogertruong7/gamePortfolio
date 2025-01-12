import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

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

export default Floor;
