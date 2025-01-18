import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const Details = () => {
  const { scene: tree1Scene, animations: tree1Animations } = useGLTF(
    "models/cherryTree1.glb"
  );
  const { scene: tree2Scene, animations: tree2Animations } = useGLTF(
    "models/cherryTree2.glb"
  );
  const { scene: tree3Scene, animations: tree3Animations } = useGLTF(
    "models/cherryTree3.glb"
  );

  const mixer = useRef();

  useEffect(() => {
    // Set up animations for each tree
    [tree1Scene, tree2Scene, tree3Scene].forEach((scene, index) => {
      if (index === 0 && tree1Animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);
        const action = mixer.current.clipAction(tree1Animations[0]);
        action.play();
      }
      if (index === 1 && tree2Animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);
        const action = mixer.current.clipAction(tree2Animations[0]);
        action.play();
      }
      if (index === 2 && tree3Animations.length > 0) {
        mixer.current = new THREE.AnimationMixer(scene);
        const action = mixer.current.clipAction(tree3Animations[0]);
        action.play();
      }

      scene.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
    });
  }, [tree1Scene, tree2Scene, tree3Scene]);

  useFrame(({ clock }) => {
    let delta = clock.getDelta();
    delta = Math.max(delta, 0.002);

    // Update all mixers for animation playback
    if (mixer.current) {
      mixer.current.update(delta);
    }
  });

  return (
    <>
      {/* First tree */}
      <primitive
        object={tree1Scene}
        scale={[8, 6, 8]}
        position={[33, -8, -219]}
        name={"tree1"}
      />

      {/* Second tree */}
      <primitive
        object={tree2Scene}
        scale={[5, 3, 5]}
        was
        position={[185, -8, -51]}
        name={"tree2"}
      />

      {/* Third tree */}
      <primitive
        object={tree3Scene}
        scale={[5, 3, 5]}
        position={[195, -8, -101]}
        name={"tree3"}
      />
    </>
  );
};

useGLTF.preload("models/cherryTree1.glb");
useGLTF.preload("models/cherryTree2.glb");
useGLTF.preload("models/cherryTree3.glb");

export default Details;
