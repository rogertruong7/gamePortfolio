import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const Details = () => {
  const { scene: tree1Scene, animations: tree1Animations } = useGLTF(
    "/models/cherryTree1.glb"
  );
  const { scene: tree2Scene, animations: tree2Animations } = useGLTF(
    "/models/cherryTree2.glb"
  );
  const { scene: tree3Scene, animations: tree3Animations } = useGLTF(
    "/models/cherryTree3.glb"
  );
  const { scene: floorDetails, animations: floorDetailsAnimations } = useGLTF(
    "/models/floorDetails.glb"
  );

  const mixer1 = useRef();
  const mixer2 = useRef();
  const mixer3 = useRef();

  useEffect(() => {
    // Set up animations for each tree
    [tree1Scene, tree2Scene, tree3Scene, floorDetails].forEach(
      (scene, index) => {
        if (index === 0 && tree1Animations.length > 0) {
          mixer1.current = new THREE.AnimationMixer(scene);
          const action = mixer1.current.clipAction(tree1Animations[0]);
          action.play();
        }
        if (index === 1 && tree2Animations.length > 0) {
          mixer2.current = new THREE.AnimationMixer(scene);
          const action = mixer2.current.clipAction(tree2Animations[0]);
          action.play();
        }
        if (index === 2 && tree3Animations.length > 0) {
          mixer3.current = new THREE.AnimationMixer(scene);
          const action = mixer3.current.clipAction(tree3Animations[0]);
          action.play();
        }

        scene.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
      }
    );
  }, [tree1Scene, tree2Scene, tree3Scene, floorDetails]);

  useFrame(({ clock }) => {
    let delta = clock.getDelta();
    delta = Math.max(delta, 0.004);

    // Update all mixers for animation playback
    if (mixer1.current) {
      mixer1.current.update(delta);
    }
    if (mixer2.current) {
      mixer2.current.update(delta);
    }
    if (mixer3.current) {
      mixer3.current.update(delta);
    }
  });

  return (
    <>
      {/* First tree */}
      <primitive
        object={tree1Scene}
        scale={[8, 5, 8]}
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
      <primitive
        object={floorDetails}
        scale={[0.3, 0.3, 0.3]}
        position={[0, 0, 0]}
        name={"floorDetails"}
      />
    </>
  );
};

export default Details;
