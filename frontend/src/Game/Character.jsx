import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const SPEED = 0.8;

const Character = React.forwardRef(({ position }, ref) => {
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
});

export default Character;
