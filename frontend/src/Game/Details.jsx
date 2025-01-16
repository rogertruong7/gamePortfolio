import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const Details = () => {
  const { scene, animations } = useGLTF("models/cherryTree1.glb");

  useEffect(() => {
    if (animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);
      const action = mixer.current.clipAction(animations[0]);
      action.play();
    }

    scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }, [scene]);

  const mixer = useRef();
  useFrame(({ clock }) => {
    let delta = clock.getDelta();
    delta = Math.max(delta, 0.002);

    if (mixer.current) {
      mixer.current.update(delta);
    }
  });

  return (
    <primitive
      object={scene}
      scale={[8, 6, 8]}
      position={[33, -8, -219]}
      name={"tree1"}
    />
  );
};

export default Details;
