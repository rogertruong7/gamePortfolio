import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneWithSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { WATER_Y, createGroundMap } from "./pondShape.js";
import { createPondReflection } from "./pondReflection.js";
import { createPondWater } from "./pondWater.js";
import {
  FLOOR_DETAILS_SCALE,
  createFallenLeaves,
  createPinkShrubs,
  plantFrontCornerBushes,
} from "./plantings.js";

// How fast the wind plays, as a fraction of the clip's real speed
const WIND_SPEED = 0.24;

// How far the view has moved to the reflection when the trees start to dissolve, and finish
const TREE_FADE_START = 0.05;
const TREE_FADE_END = 0.5;

const TREES = [
  { name: "tree1", scale: [8, 5, 8], position: [33, -8, -219] },
  { name: "tree2", scale: [5, 3, 5], position: [118, -8, -25] },
  { name: "tree3", scale: [5, 3, 5], position: [195, -8, -101] },
];

// The rocks' triangles in world space, each as three [x, y, z] corners
function worldTriangles(mesh) {
  mesh.updateWorldMatrix(true, false);
  const { index, attributes } = mesh.geometry;
  const corner = new THREE.Vector3();
  const triangles = [];
  for (let i = 0; i < index.count; i += 3) {
    const triangle = [];
    for (let j = 0; j < 3; j += 1) {
      corner.fromBufferAttribute(attributes.position, index.getX(i + j));
      corner.applyMatrix4(mesh.matrixWorld);
      triangle.push([corner.x, corner.y, corner.z]);
    }
    triangles.push(triangle);
  }
  return triangles;
}

// A copy of a tree's material that breaks up into scattered holes as uFade goes up to 1
function dissolvingCopy(material, fade) {
  const copy = material.clone();
  copy.onBeforeCompile = (shader) => {
    shader.uniforms.uFade = fade;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uFade;`
      )
      .replace(
        "#include <alphatest_fragment>",
        `#include <alphatest_fragment>
        float speckle = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        if (speckle < uFade) discard;`
      );
  };
  return copy;
}

// Discarding pixels slows down every tree it's compiled into, so the trees only wear the
// dissolving copies while someone's looking at the reflection
function createTreeDissolve(trees, fade) {
  const copies = new Map();
  const parts = [];
  trees.forEach(({ scene }) => {
    scene.traverse((node) => {
      if (!node.isMesh) return;
      if (!copies.has(node.material)) {
        copies.set(node.material, dissolvingCopy(node.material, fade));
      }
      parts.push({ node, normal: node.material, dissolving: copies.get(node.material) });
    });
  });

  let on = false;
  return {
    set(dissolving) {
      if (dissolving === on) return;
      on = dissolving;
      parts.forEach(({ node, normal, dissolving: copy }) => {
        node.material = on ? copy : normal;
      });
    },
    dispose() {
      copies.forEach((copy) => copy.dispose());
    },
  };
}

function castAndReceiveShadows(scene) {
  scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

const Details = ({ characterRef, lakeRef }) => {
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

  const groundCoverRef = useRef();
  const pinkShrubs = useMemo(() => createPinkShrubs(treeScene), [treeScene]);
  const treeFade = useMemo(() => ({ value: 0 }), []);
  const treeDissolve = useMemo(() => createTreeDissolve(trees, treeFade), [trees, treeFade]);
  useEffect(() => () => treeDissolve.dispose(), [treeDissolve]);
  const pondReflection = useMemo(() => createPondReflection(WATER_Y), []);
  const pondWater = useMemo(() => createPondWater(pondReflection), [pondReflection]);
  const pond = floorDetails.getObjectByName("pond_ice001_0");
  useEffect(() => () => pondReflection.release(), [pondReflection]);

  useEffect(() => {
    return plantFrontCornerBushes(floorDetails);
  }, [floorDetails]);

  useEffect(() => {
    trees.forEach(({ scene }) => castAndReceiveShadows(scene));
    castAndReceiveShadows(floorDetails);
    pond.material = pondWater.material;
    const ground = createGroundMap(worldTriangles(floorDetails.getObjectByName("rocks_rocks_0")));
    lakeRef.current.ground = ground;
    // The fence is gone from view, but invisWalls in Static.jsx still stop the player
    floorDetails.getObjectByName("Cube002_Material005_0").visible = false;

    const leaves = createFallenLeaves(
      ground,
      TREES.map(({ position }) => position)
    );
    const groundCover = groundCoverRef.current;
    groundCover.add(leaves, pinkShrubs.group);
    return () => {
      groundCover.remove(leaves, pinkShrubs.group);
      leaves.geometry.dispose();
      leaves.material.dispose();
      leaves.dispose();
    };
  }, [trees, floorDetails, pond, pondWater, pinkShrubs, lakeRef]);

  useEffect(() => () => pinkShrubs.dispose(), [pinkShrubs]);

  // The wind is slow, so one tree per frame is enough and saves two thirds of the work
  const turn = useMemo(() => ({ next: 0 }), []);
  useFrame(({ gl, scene, camera }, delta) => {
    const lake = lakeRef.current;
    pondWater.update(delta, lake, characterRef.current.position);
    pinkShrubs.update(delta);
    treeDissolve.set(lake.reflection > 0);
    if (lake.reflection > 0) {
      // The branches over the pond would be in the camera's way, but they're lovely in the water
      treeFade.value = 0;
      pondReflection.render(gl, scene, camera, pond);
      treeFade.value = THREE.MathUtils.smoothstep(lake.reflection, TREE_FADE_START, TREE_FADE_END);
    } else {
      pondReflection.release();
    }
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
      <group ref={groundCoverRef} />
      <primitive
        object={floorDetails}
        scale={[FLOOR_DETAILS_SCALE, FLOOR_DETAILS_SCALE, FLOOR_DETAILS_SCALE]}
        position={[0, 0, 0]}
        name={"floorDetails"}
      />
    </>
  );
};

export default React.memo(Details);
