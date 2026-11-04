import React, { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneWithSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { createPondWater } from "./pondWater.js";

// How fast the wind plays, as a fraction of the clip's real speed
const WIND_SPEED = 0.24;

const TREES = [
  { name: "tree1", scale: [8, 5, 8], position: [33, -8, -219] },
  { name: "tree2", scale: [5, 3, 5], position: [185, -8, -51] },
  { name: "tree3", scale: [5, 3, 5], position: [195, -8, -101] },
];

function castAndReceiveShadows(scene) {
  scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

const Details = () => {
  const { scene: treeScene, animations: treeAnimations } = useGLTF("/models/cherryTree.glb");
  const { scene: floorDetails } = useGLTF("/models/floorDetails.glb");

  // All three trees share one file's geometry and textures
  const trees = useMemo(
    () =>
      TREES.map((tree) => {
        const scene = cloneWithSkeleton(treeScene);
        const mixer = new THREE.AnimationMixer(scene);
        if (treeAnimations.length > 0) mixer.clipAction(treeAnimations[0]).play();
        return { ...tree, scene, mixer, pendingDelta: 0 };
      }),
    [treeScene, treeAnimations]
  );

  const pondWater = useMemo(() => createPondWater(), []);

  useEffect(() => {
    trees.forEach(({ scene }) => castAndReceiveShadows(scene));
    castAndReceiveShadows(floorDetails);
    floorDetails.getObjectByName("pond_ice001_0").material = pondWater.material;
  }, [trees, floorDetails, pondWater]);

  // The wind is slow, so one tree per frame is enough and saves two thirds of the work
  const turn = useMemo(() => ({ next: 0 }), []);
  useFrame((_, delta) => {
    pondWater.update(delta);
    trees.forEach((tree) => {
      tree.pendingDelta += delta * WIND_SPEED;
    });
    const tree = trees[turn.next];
    tree.mixer.update(tree.pendingDelta);
    tree.pendingDelta = 0;
    turn.next = (turn.next + 1) % trees.length;
  });

  return (
    <>
      {trees.map(({ name, scene, scale, position }) => (
        <primitive key={name} object={scene} scale={scale} position={position} name={name} />
      ))}
      <primitive
        object={floorDetails}
        scale={[0.3, 0.3, 0.3]}
        position={[0, 0, 0]}
        name={"floorDetails"}
      />
    </>
  );
};

export default React.memo(Details);
