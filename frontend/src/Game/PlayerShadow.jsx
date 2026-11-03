import { useEffect } from "react";
import * as THREE from "three";
import { sunPosition } from "./Static";

// The town's shadows are only drawn once, so the character can't use them. Instead its
// animated model is drawn a second time, flattened onto the ground in the direction of
// the sun. That gives a real character-shaped shadow for only a few thousand triangles,
// though it stays on the ground rather than climbing walls or benches.
const FLOOR_HEIGHT = -7.2;
const SHADOW_OPACITY = 0.32;

function shadowMaterial() {
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
    shader.uniforms.uFloorHeight = { value: FLOOR_HEIGHT };
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

function PlayerShadow({ characterRef }) {
  useEffect(() => {
    const character = characterRef.current;
    if (!character) return undefined;

    const bodyParts = [];
    character.traverse((node) => {
      if (node.isSkinnedMesh) bodyParts.push(node);
    });

    const material = shadowMaterial();
    const shadows = bodyParts.map((part) => {
      const shadow = new THREE.SkinnedMesh(part.geometry, material);
      shadow.bind(part.skeleton, part.bindMatrix);
      shadow.position.copy(part.position);
      shadow.quaternion.copy(part.quaternion);
      shadow.scale.copy(part.scale);
      shadow.frustumCulled = false;
      part.parent.add(shadow);
      return shadow;
    });

    return () => {
      shadows.forEach((shadow) => shadow.removeFromParent());
      material.dispose();
    };
  }, [characterRef]);

  return null;
}

export default PlayerShadow;
