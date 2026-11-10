import * as THREE from "three";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The water keeps a little of its own colour on top of a reflection
const STRONGEST_REFLECTION = 0.86;
const WADE_FADE_SPEED = 3;

// Keeps the standard material so the water still takes the town's light and tree shadows,
// and only swaps the colour it would have read from a texture.
export function createPondWater(reflection) {
  // Double sided because the model's negative scale leaves the pond's faces pointing down
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const time = { value: 0 };
  const reflectionStrength = { value: 0 };
  const wader = { value: new THREE.Vector2() };
  const wade = { value: 0 };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uReflectionMap = { value: reflection.texture };
    shader.uniforms.uReflectionMatrix = { value: reflection.worldToTexture };
    shader.uniforms.uReflectionStrength = reflectionStrength;
    shader.uniforms.uWader = wader;
    shader.uniforms.uWade = wade;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform mat4 uReflectionMatrix;
        varying vec2 vWaterPosition;
        varying vec4 vReflectionSpot;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 waterWorldPosition = modelMatrix * vec4(transformed, 1.0);
        vWaterPosition = waterWorldPosition.xz;
        vReflectionSpot = uReflectionMatrix * waterWorldPosition;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform sampler2D uReflectionMap;
        uniform float uReflectionStrength;
        uniform vec2 uWader;
        uniform float uWade;
        varying vec2 vWaterPosition;
        varying vec4 vReflectionSpot;

        // A ring spreading out from a raindrop, fading as it grows. Each spot repeats.
        float dropRing(vec2 position, vec2 centre, float offset) {
          float age = fract(uTime * 0.16 + offset);
          float radius = age * 16.0;
          float ring = 1.0 - smoothstep(0.0, 0.7, abs(distance(position, centre) - radius));
          return ring * (1.0 - age) * (1.0 - age);
        }

        // The same, but quicker and smaller, around the character's feet
        float wadeRing(vec2 position, float offset) {
          float age = fract(uTime * 0.7 + offset);
          float radius = 3.0 + age * 11.0;
          float ring = 1.0 - smoothstep(0.0, 0.5, abs(distance(position, uWader) - radius));
          return ring * (1.0 - age);
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
          + dropRing(p, vec2(158.0, -72.0), 0.71)
          + uWade * (wadeRing(p, 0.0) + wadeRing(p, 0.5));

        vec3 water = mix(vec3(0.03, 0.2, 0.42), vec3(0.07, 0.36, 0.58), waves * 0.5 + 0.5);
        water = mix(water, vec3(0.62, 0.86, 0.95), clamp(glints * 0.5 + rings * 0.6, 0.0, 1.0));
        diffuseColor.rgb = water;`
      )
      .replace(
        "#include <opaque_fragment>",
        `if (uReflectionStrength > 0.0) {
          vec4 reflectionSpot = vReflectionSpot;
          reflectionSpot.xy += wobble * 0.0016 * reflectionSpot.w;
          vec3 reflected = texture2DProj(uReflectionMap, reflectionSpot).rgb;
          outgoingLight = mix(outgoingLight, reflected, uReflectionStrength);
        }
        #include <opaque_fragment>`
      );
  };

  return {
    material,
    update(delta, lake, feet) {
      if (!REDUCED_MOTION) time.value += delta;
      reflectionStrength.value = lake.reflection * STRONGEST_REFLECTION;
      wader.value.set(feet.x, feet.z);
      const target = lake.inWater ? 1 : 0;
      wade.value += THREE.MathUtils.clamp(target - wade.value, -delta * WADE_FADE_SPEED, delta * WADE_FADE_SPEED);
    },
  };
}
