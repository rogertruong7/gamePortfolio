import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const Buildings = ({setBuildingsLoaded}) => {
  // loader.setMeshoptDecoder(MeshoptDecoder);
  // need to check when the buildings load and then in game, hide loading screen
  
  const { leftBuildings } = useGLTF("models/leftBuildingsNew.glb");
  const { rightBuildings } = useGLTF("models/rightBuildingsNew.glb");

  useEffect(() => {
    leftBuildings.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
    rightBuildings.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
  }, [leftBuildings, rightBuildings]);

  return (
    <primitive object={leftBuildings} scale={[0.3, 0.3, 0.3]} position={[0, 0, 0]} />
    <primitive object={rightBuildings} scale={[0.3, 0.3, 0.3]} position={[0, 0, 0]} />
  );
};

export default Buildings;