import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const Buildings = ({ setBuildingsLoaded }) => {
  const { scene: leftBuildingsScene } = useGLTF("models/leftBuildingsNew.glb");
  const { scene: rightBuildingsScene } = useGLTF(
    "models/rightBuildingsNew.glb"
  );

  useEffect(() => {
    // Traverse the loaded scenes to set shadow properties for each mesh
    leftBuildingsScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
    rightBuildingsScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });

    // Once both scenes are loaded, update the loading state
    if (leftBuildingsScene && rightBuildingsScene) {
      setBuildingsLoaded(true); // Update loading state
    }
  }, [leftBuildingsScene, rightBuildingsScene, setBuildingsLoaded]);

  return (
    <>
      <primitive
        object={leftBuildingsScene}
        scale={[0.3, 0.3, 0.3]}
        position={[-5, 0, 0]} // Example position, you can adjust as needed
      />
      <primitive
        object={rightBuildingsScene}
        scale={[0.3, 0.3, 0.3]}
        position={[5, 0, 0]} // Example position, you can adjust as needed
      />
    </>
  );
};

useGLTF.preload("models/leftBuildingsNew.glb");
useGLTF.preload("models/rightBuildingsNew.glb");

export default Buildings;
