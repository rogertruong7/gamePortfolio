import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const _size = new THREE.Vector2();

function createMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPicture: { value: null },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uUnderwater: { value: 0 },
      uFlood: { value: 0 },
      uWaves: { value: REDUCED_MOTION ? 0 : 1 },
    },
    depthTest: false,
    depthWrite: false,
    // The picture has already been through the renderer's colour handling
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uPicture;
      uniform float uTime;
      uniform float uAspect;
      uniform float uUnderwater;
      uniform float uFlood;
      uniform float uWaves;
      varying vec2 vUv;

      void main() {
        vec2 sway = vec2(
          sin(vUv.y * 24.0 + uTime * 1.5) + 0.4 * sin(vUv.y * 57.0 - uTime * 0.9),
          cos(vUv.x * 21.0 + uTime * 1.2)
        ) * 0.0026 * uUnderwater * uWaves;
        vec3 picture = texture2D(uPicture, vUv + sway).rgb;

        float brightness = dot(picture, vec3(0.3, 0.59, 0.11));
        vec3 tinted = mix(picture, vec3(0.16, 0.52, 0.86) * (brightness * 1.25 + 0.12), 0.68);

        // Sunlight wavering through the water
        vec2 c = vUv * vec2(uAspect, 1.0) * 13.0;
        float caustic = sin(c.x + uTime * 0.5 + sin(c.y * 1.3 + uTime * 0.7))
          * sin(c.y + uTime * 0.4 + sin(c.x * 1.1 - uTime * 0.6));
        tinted += vec3(0.05, 0.11, 0.14) * smoothstep(0.5, 1.0, caustic) * uWaves;

        // Darker towards the corners, like looking through deep water
        tinted *= 1.0 - 0.6 * smoothstep(0.35, 0.85, distance(vUv, vec2(0.5)));

        vec3 colour = mix(picture, tinted, uUnderwater);
        colour = mix(colour, vec3(0.03, 0.19, 0.37), uFlood);
        gl_FragColor = vec4(colour, 1.0);
      }`,
  });
}

// Takes over drawing while it's mounted: the town is drawn to the screen as normal, then that
// picture is drawn back over itself through the filter. With the filter at zero nothing changes,
// so there's no jump in colour when a dive starts, and normal play doesn't pay for any of it.
function UnderwaterFilter({ lakeRef }) {
  const material = useMemo(createMaterial, []);
  const quad = useMemo(() => new FullScreenQuad(material), [material]);
  const picture = useMemo(() => ({ texture: null }), []);

  useEffect(
    () => () => {
      picture.texture?.dispose();
      material.dispose();
      quad.dispose();
    },
    [picture, material, quad]
  );

  useFrame(({ gl, scene, camera }, delta) => {
    gl.render(scene, camera);

    gl.getDrawingBufferSize(_size);
    if (picture.texture?.image.width !== _size.x || picture.texture?.image.height !== _size.y) {
      picture.texture?.dispose();
      picture.texture = new THREE.FramebufferTexture(_size.x, _size.y);
      picture.texture.minFilter = THREE.LinearFilter;
      picture.texture.magFilter = THREE.LinearFilter;
      material.uniforms.uPicture.value = picture.texture;
      material.uniforms.uAspect.value = _size.x / _size.y;
    }
    gl.copyFramebufferToTexture(picture.texture);

    const lake = lakeRef.current;
    const { uniforms } = material;
    uniforms.uTime.value += delta;
    uniforms.uUnderwater.value = lake.underwater;
    uniforms.uFlood.value = lake.flood;
    quad.render(gl);
  }, 1);

  return null;
}

export default UnderwaterFilter;
