import * as THREE from "three";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Keeps the standard material so the water still takes the town's light and tree shadows,
// and only swaps the colour it would have read from a texture.
export function createPondWater() {
  // Double sided because the model's negative scale leaves the pond's faces pointing down
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const time = { value: 0 };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vWaterPosition;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vWaterPosition = (modelMatrix * vec4(transformed, 1.0)).xz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        varying vec2 vWaterPosition;

        // A ring spreading out from a raindrop, fading as it grows. Each spot repeats.
        float dropRing(vec2 position, vec2 centre, float offset) {
          float age = fract(uTime * 0.16 + offset);
          float radius = age * 16.0;
          float ring = 1.0 - smoothstep(0.0, 0.7, abs(distance(position, centre) - radius));
          return ring * (1.0 - age) * (1.0 - age);
        }`
      )
      .replace(
        "#include <map_fragment>",
        `vec2 p = vWaterPosition;
        vec2 wobble = vec2(sin(p.y * 0.21 + uTime * 0.7), cos(p.x * 0.19 - uTime * 0.6)) * 2.2;
        float waves = (
          sin((p.x + wobble.x) * 0.52 + uTime * 0.85) +
          sin((p.y + wobble.y) * 0.61 - uTime * 0.7) +
          sin((p.x + p.y + wobble.x - wobble.y) * 0.33 + uTime * 0.45)
        ) / 3.0;

        // Thin wavy lines where the waves pass one height, rather than patches above it
        float glints = 1.0 - smoothstep(0.0, 0.035, abs(waves - 0.28));
        float rings = dropRing(p, vec2(150.0, -112.0), 0.0)
          + dropRing(p, vec2(168.0, -84.0), 0.37)
          + dropRing(p, vec2(158.0, -72.0), 0.71);

        vec3 water = mix(vec3(0.03, 0.2, 0.42), vec3(0.07, 0.36, 0.58), waves * 0.5 + 0.5);
        water = mix(water, vec3(0.62, 0.86, 0.95), clamp(glints * 0.5 + rings * 0.6, 0.0, 1.0));
        diffuseColor.rgb = water;`
      );
  };

  return {
    material,
    update(delta) {
      if (!REDUCED_MOTION) time.value += delta;
    },
  };
}
