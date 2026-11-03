import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paintLiquidChrome } from "../Helpers/liquidChrome.js";

// Blue sky, a far-off globe of chrome lines around the town and three layers of chrome stars.
//
// Built to cost almost nothing per frame: each layer is one draw call, the chrome
// comes from a painted texture rather than lights or reflections, and the tumbling
// runs on the graphics card so star count doesn't add any CPU work.

// The middle of the island, measured from the floor model
const TOWN_CENTRE = new THREE.Vector3(118.5, 0, -124.8);
// Darker blue at the top of the screen, through light blue, to white at the bottom
const SKY_GRADIENT = [
  [0, "#3f8fd6"],
  [0.5, "#a9dcf7"],
  [1, "#ffffff"],
];
// Far-off things fade towards the middle of the sky
const FOG_COLOUR = "#a9dcf7";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Every layer sits further out than the camera can reach, so stars never get in the way.
const NEAR_LAYER = { count: 18, minRadius: 480, maxRadius: 720, minSize: 12, maxSize: 34, spin: 0.35 };
const MID_LAYER = { count: 110, minRadius: 820, maxRadius: 1150, minSize: 6, maxSize: 15, spin: 0.6 };
const FAR_LAYER = { count: 260, minRadius: 1200, maxRadius: 1650 };

// Thin blue chrome lines drawn on a huge sphere around the town, like the grid on a
// globe. Latitudes in degrees, chosen so lines cross both the top and bottom of the view.
const GLOBE = {
  radius: 1800,
  latitudes: [-60, -35, -12, 10, 35],
  meridians: 4,
  thickness: 2.5,
  tint: "#a9d0f0",
  opacity: 0.45,
};
const LINE_SEGMENTS = 256;
const LINE_SIDES = 5;

function seededRandom(start) {
  let seed = start;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function paintSky() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  SKY_GRADIENT.forEach(([position, colour]) => gradient.addColorStop(position, colour));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function paintChrome() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const bands = ctx.createLinearGradient(0, 0, 0, 256);
  [
    [0, "#fdfeff"],
    [0.2, "#e9eef6"],
    [0.42, "#9aa3b2"],
    [0.5, "#20242e"],
    [0.56, "#0e1016"],
    [0.6, "#b9c2d0"],
    [0.72, "#f8fbff"],
    [0.86, "#7d8696"],
    [1, "#2a2e38"],
  ].forEach(([position, colour]) => bands.addColorStop(position, colour));
  ctx.fillStyle = bands;
  ctx.fillRect(0, 0, 256, 256);

  const highlight = ctx.createRadialGradient(92, 70, 2, 92, 70, 62);
  highlight.addColorStop(0, "rgba(255,255,255,1)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.fillRect(0, 0, 256, 256);

  const rim = ctx.createRadialGradient(128, 128, 88, 128, 128, 128);
  rim.addColorStop(0, "rgba(10,12,18,0)");
  rim.addColorStop(1, "rgba(10,12,18,.85)");
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The four-armed curved outline of a liquid chrome star
function liquidOutline(angle) {
  const radius = 0.2 + 0.8 * Math.pow(Math.abs(Math.cos(2 * angle)), 5);
  const bent = angle + 0.85 * radius * radius;
  return [radius * Math.cos(bent), radius * Math.sin(bent)];
}

// Inflates the outline into a rounded shape: an edge ring, then shrinking rings on
// the front and back, each closed off by a tip.
function liquidStarGeometry(segments, rings, thickness) {
  const positions = [];
  const indices = [];
  const addRing = (scale, z) => {
    for (let i = 0; i < segments; i++) {
      const [x, y] = liquidOutline((i / segments) * Math.PI * 2);
      positions.push(x * scale, y * scale, z);
    }
  };
  const addSide = (direction) => {
    let previous = 0;
    for (let ring = 1; ring < rings; ring++) {
      const scale = 1 - ring / rings;
      const start = positions.length / 3;
      addRing(scale, direction * thickness * Math.sqrt(1 - scale * scale));
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        const [a, b, c, d] = [previous + i, previous + next, start + i, start + next];
        if (direction > 0) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
      previous = start;
    }
    const tip = positions.length / 3;
    positions.push(0, 0, direction * thickness);
    for (let i = 0; i < segments; i++) {
      const [a, b] = [previous + i, previous + (i + 1) % segments];
      if (direction > 0) indices.push(a, b, tip);
      else indices.push(a, tip, b);
    }
  };

  addRing(1, 0);
  addSide(1);
  addSide(-1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function chromeMaterial(matcap, uTime) {
  const material = new THREE.MeshMatcapMaterial({
    matcap,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        attribute vec4 aSpin;
        vec3 spin(vec3 v) {
          float a = uTime * aSpin.w;
          vec3 k = aSpin.xyz;
          return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
        }`
      )
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = spin(normal);")
      .replace("#include <begin_vertex>", "vec3 transformed = spin(position);");
  };
  return material;
}

function scatterStars(geometry, material, layer, random) {
  const { count, minRadius, maxRadius, minSize, maxSize, spin } = layer;
  const spins = new Float32Array(count * 4);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const axis = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Weighted towards the band of sky the camera actually looks at
    const height = random() * 1.1 - 0.5;
    const around = random() * Math.PI * 2;
    const flat = Math.sqrt(1 - height * height);
    const radius = minRadius + (maxRadius - minRadius) * random();
    position
      .set(flat * Math.cos(around), height, flat * Math.sin(around))
      .multiplyScalar(radius)
      .add(TOWN_CENTRE);
    rotation.setFromEuler(euler.set(random() * 6.3, random() * 6.3, random() * 6.3));
    scale.setScalar(minSize + (maxSize - minSize) * random() * random());
    mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));

    axis.set(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    const speed = (random() * 0.7 + 0.3) * spin * (random() > 0.5 ? 1 : -1);
    spins.set([axis.x, axis.y, axis.z, speed], i * 4);
  }

  geometry.setAttribute("aSpin", new THREE.InstancedBufferAttribute(spins, 4));
  mesh.frustumCulled = false;
  return mesh;
}

function globeRing(ringRadius, makePoint) {
  const points = [];
  for (let i = 0; i < 64; i++) makePoint(points, (i / 64) * Math.PI * 2, ringRadius);
  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, LINE_SEGMENTS, GLOBE.thickness, LINE_SIDES, true);
}

function chromeGlobe() {
  const { radius, latitudes, meridians } = GLOBE;
  const rings = [];

  latitudes.forEach((latitude) => {
    const angle = THREE.MathUtils.degToRad(latitude);
    const height = radius * Math.sin(angle);
    rings.push(
      globeRing(radius * Math.cos(angle), (points, around, ringRadius) => {
        points.push(
          new THREE.Vector3(ringRadius * Math.cos(around), height, ringRadius * Math.sin(around))
        );
      })
    );
  });

  // Each meridian is a full circle through both poles, so it only needs half a turn
  for (let i = 0; i < meridians; i++) {
    const heading = (i / meridians) * Math.PI;
    rings.push(
      globeRing(radius, (points, around, ringRadius) => {
        const flat = ringRadius * Math.cos(around);
        points.push(
          new THREE.Vector3(
            flat * Math.cos(heading),
            ringRadius * Math.sin(around),
            flat * Math.sin(heading)
          )
        );
      })
    );
  }

  const geometry = mergeGeometries(rings);
  rings.forEach((ring) => ring.dispose());

  const matcap = new THREE.CanvasTexture(paintLiquidChrome());
  matcap.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshMatcapMaterial({
      matcap,
      color: GLOBE.tint,
      transparent: true,
      opacity: GLOBE.opacity,
      toneMapped: false,
      fog: false, // at this distance fog would erase the lines completely
    })
  );
  mesh.frustumCulled = false;
  return mesh;
}

function farStars(uTime, random) {
  const { count, minRadius, maxRadius } = FAR_LAYER;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const height = random() * 2 - 1;
    const around = random() * Math.PI * 2;
    const flat = Math.sqrt(1 - height * height);
    const radius = minRadius + (maxRadius - minRadius) * random();
    positions.set(
      [
        TOWN_CENTRE.x + radius * flat * Math.cos(around),
        TOWN_CENTRE.y + radius * height,
        TOWN_CENTRE.z + radius * flat * Math.sin(around),
      ],
      i * 3
    );
    sizes[i] = 9 + random() * random() * 34;
    phases[i] = random() * 6.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        vTwinkle = 0.55 + 0.45 * sin(uTime * 1.4 + aPhase);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (620.0 / -viewPosition.z) * (0.75 + 0.25 * vTwinkle);
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `
      varying float vTwinkle;
      void main() {
        vec2 p = abs(gl_PointCoord - 0.5) * 2.0;
        float alpha = smoothstep(1.0, 0.72, pow(p.x, 0.5) + pow(p.y, 0.5));
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vTwinkle);
      }`,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function Backdrop() {
  const linesRef = useRef();
  const nearRef = useRef();
  const midRef = useRef();
  const farRef = useRef();
  const elapsed = useRef(0);

  const layers = useMemo(() => {
    const random = seededRandom(7);
    const uTime = { value: 0 };
    const matcap = paintChrome();
    const near = scatterStars(
      liquidStarGeometry(64, 3, 0.3),
      chromeMaterial(matcap, uTime),
      NEAR_LAYER,
      random
    );
    const mid = scatterStars(
      liquidStarGeometry(24, 1, 0.3),
      chromeMaterial(matcap, uTime),
      MID_LAYER,
      random
    );
    const far = farStars(uTime, random);
    const lines = chromeGlobe();
    return { sky: paintSky(), lines, near, mid, far, uTime, matcap };
  }, []);

  useEffect(
    () => () => {
      layers.sky.dispose();
      layers.lines.material.matcap.dispose();
      [layers.lines, layers.near, layers.mid, layers.far].forEach((layer) => {
        layer.geometry.dispose();
        layer.material.dispose();
      });
      layers.matcap.dispose();
    },
    [layers]
  );

  useFrame((_, delta) => {
    if (REDUCED_MOTION) return;
    const time = (elapsed.current += delta);
    layers.uTime.value = time;
    linesRef.current.rotation.y = -time * 0.004;
    nearRef.current.rotation.y = time * 0.012;
    nearRef.current.rotation.x = Math.sin(time * 0.05) * 0.03;
    midRef.current.rotation.y = -time * 0.006;
    farRef.current.rotation.y = time * 0.002;
  });

  return (
    <>
      <primitive attach="background" object={layers.sky} />
      <fog attach="fog" args={[FOG_COLOUR, 700, 1600]} />
      <group ref={linesRef} position={TOWN_CENTRE}>
        <primitive object={layers.lines} />
      </group>
      <group ref={nearRef}>
        <primitive object={layers.near} />
      </group>
      <group ref={midRef}>
        <primitive object={layers.mid} />
      </group>
      <group ref={farRef}>
        <primitive object={layers.far} />
      </group>
    </>
  );
}

export default Backdrop;
