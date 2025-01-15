import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const Buildings = ({ setLoading }) => {

  // Different way of loading
  const { scene: leftBuildingsScene } = useLoader(
    GLTFLoader,
    "models/leftBuildingsNew.glb",
    (loader) => {
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = Math.round((itemsLoaded / itemsTotal) * 100);
        console.log(progress);
      };
    }
  );

  const { scene: rightBuildingsScene } = useGLTF(
    "models/rightBuildingsNew.glb"
  );

  useEffect(() => {
    // Traverse the loaded scenes to set shadow properties for each mesh
    leftBuildingsScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    rightBuildingsScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    // Once both scenes are loaded, update the loading state
    if (leftBuildingsScene && rightBuildingsScene) {
      console.log("loaded");
      setLoading(false); // Update loading state
    }
  }, [leftBuildingsScene, rightBuildingsScene, setLoading]);

  return (
    <>
      <primitive
        object={leftBuildingsScene}
        scale={[0.3, 0.3, 0.3]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      />
      <primitive
        object={rightBuildingsScene}
        scale={[0.3, 0.3, 0.3]}
        position={[-1.6, 0, 0]} 
        castShadow
        receiveShadow
      />
    </>
  );
};

useGLTF.preload("models/leftBuildingsNew.glb");
useGLTF.preload("models/rightBuildingsNew.glb");

export default Buildings;
