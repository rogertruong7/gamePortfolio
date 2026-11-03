import React, { useEffect, useMemo, useRef } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { paintLiquidChrome } from "../Helpers/liquidChrome.js";
import { showcases } from "./Static";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// While the player stands in a label's doorway, a band of light crosses it for this
// long, rests briefly, then goes again
const SHIMMER_SECONDS = 2.4;
const SHIMMER_REST_SECONDS = 0.6;
const SHIMMER_OFF = -3;
const EDGE_BRIGHTNESS = "0.5";

let sharedChrome = null;
function liquidChromeTexture() {
  if (!sharedChrome) {
    sharedChrome = new THREE.CanvasTexture(paintLiquidChrome());
    sharedChrome.colorSpace = THREE.SRGBColorSpace;
  }
  return sharedChrome;
}

// Chrome reflects what's around it, but the front of a letter is flat and would come
// out as one solid colour. Tilting the surface from the top of the letters to the
// bottom gives them a chrome look. That chrome is then mostly flattened into white, kept
// just under full brightness so the shimmer still shows on top, and the bevelled edges
// are darkened into an outline so the letters stand out from the sky.
function chromeTextMaterial(size, uShimmer) {
  const material = new THREE.MeshMatcapMaterial({
    matcap: liquidChromeTexture(),
    toneMapped: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShimmer = uShimmer;
    shader.uniforms.uHalfSize = { value: new THREE.Vector2(size.x / 2, size.y / 2) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLabelPosition;
        varying float vFacesFront;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLabelPosition = position;
        vFacesFront = abs(normal.z);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vLabelPosition;
        varying float vFacesFront;
        uniform float uShimmer;
        uniform vec2 uHalfSize;`
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec2 across = vLabelPosition.xy / uHalfSize;
        float isFront = smoothstep(0.8, 0.98, vFacesFront);
        normal = normalize(normal + vec3(
          0.06 * sin(across.x * 7.0),
          0.6 * across.y + 0.2 + 0.05 * sin(across.x * 4.0),
          0.0
        ));`
      )
      .replace(
        "#include <opaque_fragment>",
        `float reflection = dot(outgoingLight, vec3(0.3, 0.59, 0.11));
        outgoingLight = vec3(0.8 + 0.18 * reflection);
        outgoingLight *= mix(${EDGE_BRIGHTNESS}, 1.0, isFront);
        outgoingLight += vec3(smoothstep(0.26, 0.0, abs(across.x + across.y * 0.25 - uShimmer)));
        #include <opaque_fragment>`
      );
  };
  return material;
}

function Text({ text, position, fontPath, fontSize, cameraRef, characterRef, showcaseName }) {
  const font = useLoader(FontLoader, fontPath);
  const meshRef = useRef();
  // How far through the current pass we are, or null when not shimmering
  const shimmerTime = useRef(null);
  const doorway = useMemo(
    () => showcases.find((showcase) => showcase.showcaseName === showcaseName).box,
    [showcaseName]
  );

  const geometry = useMemo(() => {
    const geo = new TextGeometry(text, {
      font,
      size: fontSize,
      depth: 3,
      curveSegments: 2,
      bevelEnabled: true,
      bevelSize: fontSize * 0.035,
      bevelThickness: fontSize * 0.1,
      bevelSegments: 2,
    });
    geo.center();
    geo.computeBoundingBox();
    return geo;
  }, [text, font, fontSize]);

  // Starts off the left edge, so nothing shows between passes
  const uShimmer = useMemo(() => ({ value: SHIMMER_OFF }), []);
  const material = useMemo(() => {
    const size = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    return chromeTextMaterial(size, uShimmer);
  }, [geometry, uShimmer]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, delta) => {
    if (meshRef.current && cameraRef.current) {
      meshRef.current.lookAt(cameraRef.current.position);
    }
    if (REDUCED_MOTION || !characterRef.current) return;

    const standingInDoorway = doorway.containsPoint(characterRef.current.position);
    if (shimmerTime.current === null) {
      if (!standingInDoorway) return;
      shimmerTime.current = 0;
    }
    shimmerTime.current += delta;

    // A pass already under way finishes even if the player walks off
    if (shimmerTime.current > SHIMMER_SECONDS + SHIMMER_REST_SECONDS) {
      shimmerTime.current = standingInDoorway ? 0 : null;
    }
    const passing = shimmerTime.current !== null && shimmerTime.current < SHIMMER_SECONDS;
    uShimmer.value = passing ? -1.6 + (shimmerTime.current / SHIMMER_SECONDS) * 3.2 : SHIMMER_OFF;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} position={position} />;
}

export default React.memo(Text);
