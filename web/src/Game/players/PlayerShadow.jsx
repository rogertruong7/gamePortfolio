import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { isJumping } from "../lake/lake";
import { sunPosition } from "../Static";

// The town's shadows are only drawn once, so the character can't use them. Instead its
// animated model is drawn a second time, flattened onto the ground in the direction of
// the sun. That gives a real character-shaped shadow for only a few thousand triangles,
// though it stays on the ground rather than climbing walls or benches.
const FLOOR_HEIGHT = -7.2;
const SHADOW_OPACITY = 0.32;
// How far above the rocks it's drawn, and the layer the main camera sees but the reflection doesn't
const ABOVE_GROUND = 0.5;
const SHADOW_LAYER = 1;

function shadowMaterial(floorHeight) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: SHADOW_OPACITY,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
    depthWrite: false,
    // The flattened model overlaps itself. The stencil lets each pixel be darkened only
    // once, otherwise the overlaps would flicker as darker patches.
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
    // Keeps it from flickering against the ground just below it
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFloorHeight = floorHeight;
    shader.uniforms.uSun = { value: new THREE.Vector3(...sunPosition) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uFloorHeight;
        uniform vec3 uSun;`
      )
      .replace(
        "#include <project_vertex>",
        `vec4 flattened = modelMatrix * vec4(transformed, 1.0);
        flattened.xz -= uSun.xz / uSun.y * (flattened.y - uFloorHeight);
        flattened.y = uFloorHeight;
        vec4 mvPosition = viewMatrix * flattened;
        gl_Position = projectionMatrix * mvPosition;`
      );
  };
  return material;
}

// look is only there to rebuild the shadow when the character's look adds or takes away pieces
function PlayerShadow({ characterRef, lakeRef, look }) {
  const floorHeight = useMemo(() => ({ value: FLOOR_HEIGHT }), []);
  const material = useMemo(() => shadowMaterial(floorHeight), [floorHeight]);

  useFrame(() => {
    const lake = lakeRef.current;
    const { x, z } = characterRef.current.position;
    if (lake.ground) {
      floorHeight.value = Math.max(FLOOR_HEIGHT, lake.ground.heightAt(x, z) + ABOVE_GROUND);
    }
    material.visible = !isJumping(lake.phase);
    material.opacity = SHADOW_OPACITY * (1 - lake.reflection);
  });

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const character = characterRef.current;
    if (!character) return undefined;

    const bodyParts = [];
    const pieces = [];
    character.traverse((node) => {
      if (node.isSkinnedMesh) bodyParts.push(node);
      else if (node.isMesh && node.userData.lookPiece) pieces.push(node);
    });

    const shadows = bodyParts.map((part) => {
      const shadow = new THREE.SkinnedMesh(part.geometry, material);
      shadow.bind(part.skeleton, part.bindMatrix);
      shadow.position.copy(part.position);
      shadow.quaternion.copy(part.quaternion);
      shadow.scale.copy(part.scale);
      // Shares the hairstyle's morph, so the shadow has the same hair
      if (part.morphTargetInfluences) shadow.morphTargetInfluences = part.morphTargetInfluences;
      shadow.frustumCulled = false;
      shadow.layers.set(SHADOW_LAYER);
      part.parent.add(shadow);
      return shadow;
    });
    // Hair and hats ride on a bone, so their shadows go inside them and move with them
    pieces.forEach((piece) => {
      const shadow = new THREE.Mesh(piece.geometry, material);
      shadow.frustumCulled = false;
      shadow.layers.set(SHADOW_LAYER);
      piece.add(shadow);
      shadows.push(shadow);
    });

    return () => {
      shadows.forEach((shadow) => shadow.removeFromParent());
    };
  }, [characterRef, material, look]);

  return null;
}

export default PlayerShadow;
