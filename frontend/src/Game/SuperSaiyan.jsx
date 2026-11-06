import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const POWER_UP_SECONDS = 0.8;
const AURA_WIDTH = 36;
const AURA_HEIGHT = 50;
// Measured from the feet. It sits in front of the character so its glow falls over the model.
const AURA_RISE = 17;
const AURA_TOWARDS_CAMERA = 6;
// Seen by the main camera but not the reflection, whose mirrored view would show the plane's edge
const MAIN_CAMERA_ONLY_LAYER = 1;

const _toCamera = new THREE.Vector3();

function createAuraMaterial(power) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: power },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform float uPower;
      varying vec2 vUv;

      void main() {
        float x = vUv.x * 2.0 - 1.0;
        float y = vUv.y;

        // A flame that narrows to a point, with its sides licking upwards
        float lick = sin(y * 11.0 - uTime * 9.0 + x * 3.0) * 0.06 + sin(y * 23.0 - uTime * 14.0) * 0.03;
        float width = mix(0.82, 0.08, pow(y, 1.3)) + lick;
        float across = abs(x) / max(width, 0.01);
        float body = 1.0 - smoothstep(0.55, 1.0, across);

        // Tongues of different heights along the top edge
        float top = 0.72 + 0.12 * sin(x * 9.0 + uTime * 6.0) + 0.07 * sin(x * 21.0 - uTime * 11.0);
        body *= 1.0 - smoothstep(top - 0.34, top, y);
        body *= smoothstep(0.0, 0.1, y);

        // Lighter in the middle, so the character still shows through
        float rim = mix(0.26, 1.0, smoothstep(0.1, 0.8, across));

        // Streaks of energy shooting up through it
        float column = pow(max(0.0, sin(x * 34.0 + sin(uTime * 3.0) * 2.0)), 24.0);
        float streak = column * smoothstep(0.55, 1.0, fract(y * 1.6 - uTime * 2.1 + x * 4.0));

        float flicker = 0.88 + 0.12 * sin(uTime * 31.0);
        float strength = (body * rim * 0.95 + streak * body * 0.6) * flicker * uPower;
        vec3 colour = mix(vec3(1.0, 0.58, 0.02), vec3(1.0, 0.9, 0.35), body * body);
        // Additive blending multiplies by alpha as well, which would square the strength
        gl_FragColor = vec4(colour * strength, 1.0);
      }`,
  });
}

// Gold hair and a flame around the character, for beating Sans. Only mounted once that happens, so
// nobody else pays for it.
function SuperSaiyan({ characterRef }) {
  const auraRef = useRef();
  // The character's look turns its hair gold as this goes up, whichever hairstyle it has
  const power = useMemo(() => characterRef.current.userData.dress.uniforms.uGold, [characterRef]);
  const auraMaterial = useMemo(() => createAuraMaterial(power), [power]);

  useEffect(() => {
    auraRef.current.layers.set(MAIN_CAMERA_ONLY_LAYER);
    return () => {
      power.value = 0;
      auraMaterial.dispose();
    };
  }, [power, auraMaterial]);

  useFrame(({ camera }, delta) => {
    power.value = REDUCED_MOTION ? 1 : Math.min(1, power.value + delta / POWER_UP_SECONDS);
    if (!REDUCED_MOTION) auraMaterial.uniforms.uTime.value += delta;

    const aura = auraRef.current;
    const feet = characterRef.current.position;
    _toCamera.subVectors(camera.position, feet).normalize().multiplyScalar(AURA_TOWARDS_CAMERA);
    aura.position.copy(feet).add(_toCamera);
    aura.position.y += AURA_RISE;
    // Leans towards the camera but keeps the world's up, so the flames still rise from the feet
    // when the picture is upside down
    aura.lookAt(camera.position);
  });

  return (
    <mesh ref={auraRef} material={auraMaterial}>
      <planeGeometry args={[AURA_WIDTH, AURA_HEIGHT]} />
    </mesh>
  );
}

export default SuperSaiyan;
