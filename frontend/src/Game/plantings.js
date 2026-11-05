import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { scatterFallenLeaves } from "./fallenLeaves.js";

// floorDetails is drawn at this scale, so its own measurements are bigger than the world's
export const FLOOR_DETAILS_SCALE = 0.3;

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FLOOR_Y = -8;

// Half the height of the model's bush, which keeps every size sitting on the ground
const BUSH_HALF_HEIGHT = 3.7;
// Two groups, with each bush pushed into its neighbours so a group reads as one planting. They're
// all near full size, since the small ones looked like the rocks scattered around them.
const FRONT_CORNER_BUSHES = [
  { x: 178, z: -49, spin: 0.6, size: 1.15 },
  { x: 186, z: -53, spin: 2.1, size: 1 },
  { x: 185, z: -44, spin: 4, size: 1.05 },
  { x: 204, z: -35, spin: 5.1, size: 1.15 },
  { x: 211, z: -30, spin: 3.2, size: 1 },
];

// More of the model's own bush, turned and sized so they don't look stamped out
function plantBushes(source, bushes) {
  const planted = new THREE.InstancedMesh(source.geometry, source.material, bushes.length);
  const original = new THREE.Matrix4();
  source.getMatrixAt(0, original);
  const originalY = new THREE.Vector3().setFromMatrixPosition(original).y;
  original.setPosition(0, 0, 0);

  const placed = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  bushes.forEach(({ x, z, spin, size }, i) => {
    placed
      .makeRotationY(spin)
      .scale(scale.setScalar(size))
      .multiply(original)
      .setPosition(
        x / FLOOR_DETAILS_SCALE,
        originalY + ((size - 1) * BUSH_HALF_HEIGHT) / FLOOR_DETAILS_SCALE,
        z / FLOOR_DETAILS_SCALE
      );
    planted.setMatrixAt(i, placed);
  });
  return planted;
}

// Adds them to floorDetails, and returns a function that takes them away again
export function plantFrontCornerBushes(floorDetails) {
  const planted = plantBushes(floorDetails.getObjectByName("Object_11"), FRONT_CORNER_BUSHES);
  floorDetails.add(planted);
  return () => {
    floorDetails.remove(planted);
    planted.dispose();
  };
}

// Little blossom shrubs, tucked in around the bushes. Radius and height are in world units.
const PINK_SHRUBS = [
  { x: 172, z: -41, radius: 6.5, height: 8 },
  { x: 193, z: -47, radius: 7, height: 9 },
  { x: 180, z: -37, radius: 5, height: 6.5 },
  { x: 197, z: -31, radius: 6.5, height: 8 },
  { x: 208, z: -41, radius: 5.5, height: 7 },
];
const SHRUB_SEED = 3301;
const LEAF_CARDS_PER_UNIT_OF_RADIUS = 7;
const LEAF_CARD_SIZE = 2.6;
// The tree has thousands of leaf cards, and this many gives plenty of variety
const LEAF_CARD_SAMPLES = 40;
const TWIGS_PER_SHRUB = 7;
const TWIG_COLOUR = "#4f3d22";
// How far the top of a shrub moves in the wind
const SWAY = 0.35;
const SWAY_SPEED = 0.9;

// Pulls some leaf cards out of the tree's mesh, each as its corners measured from its middle and
// scaled to LEAF_CARD_SIZE, with its spot on the leaf texture
function sampleLeafCards(geometry) {
  const { index, attributes } = geometry;
  const triangles = index.count / 3;
  const step = Math.floor(triangles / (LEAF_CARD_SAMPLES * 2));
  const cards = [];
  for (let triangle = 0; triangle + 1 < triangles && cards.length < LEAF_CARD_SAMPLES; triangle += step) {
    // A leaf card is a quad, so the next triangle along shares this one's long edge
    const corners = [];
    for (let i = 0; i < 6; i += 1) {
      const vertex = index.getX(triangle * 3 + i);
      if (!corners.includes(vertex)) corners.push(vertex);
    }
    if (corners.length === 4) {
      const points = corners.map((vertex) =>
        new THREE.Vector3().fromBufferAttribute(attributes.position, vertex)
      );
      const middle = points
        .reduce((total, point) => total.add(point), new THREE.Vector3())
        .divideScalar(4);
      const longest = Math.max(...points.map((point) => point.distanceTo(middle)));
      cards.push({
        corners: points.map((point) => point.sub(middle).multiplyScalar(LEAF_CARD_SIZE / longest)),
        uvs: corners.map((vertex) => [attributes.uv.getX(vertex), attributes.uv.getY(vertex)]),
      });
    }
  }
  return cards;
}

// The shrubs' leaves as one mesh, so they're one draw call however many there are
function shrubLeafGeometry(cards, random) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const spin = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const spot = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const outwards = new THREE.Vector3();

  PINK_SHRUBS.forEach(({ x, z, radius, height }) => {
    const count = Math.round(radius * LEAF_CARDS_PER_UNIT_OF_RADIUS);
    for (let i = 0; i < count; i += 1) {
      // A dome, with most of the leaves towards its outside so the middle doesn't go solid
      const around = random() * Math.PI * 2;
      const up = random() ** 0.8;
      const out = Math.sqrt(1 - up * up) * (0.55 + 0.45 * random());
      spot.set(Math.cos(around) * out * radius, up * height, Math.sin(around) * out * radius);
      outwards.set(spot.x / radius, spot.y / height + 0.6, spot.z / radius).normalize();
      spin.setFromEuler(euler.set(random() * 6.3, random() * 6.3, random() * 6.3));

      const card = cards[Math.floor(random() * cards.length)];
      const first = positions.length / 3;
      card.corners.forEach((point, c) => {
        corner.copy(point).applyQuaternion(spin);
        positions.push(
          x + spot.x + corner.x,
          Math.max(FLOOR_Y + 0.3, FLOOR_Y + spot.y + corner.y),
          z + spot.z + corner.z
        );
        normals.push(outwards.x, outwards.y, outwards.z);
        uvs.push(card.uvs[c][0], card.uvs[c][1]);
      });
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// A few thin branches, showing under the leaves like the trees' do
function shrubTwigGeometry(random) {
  const twigs = [];
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const upright = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const lean = new THREE.Quaternion();

  PINK_SHRUBS.forEach(({ x, z, radius, height }) => {
    for (let i = 0; i < TWIGS_PER_SHRUB; i += 1) {
      const around = random() * Math.PI * 2;
      const reach = radius * (0.35 + 0.35 * random());
      from.set(x, FLOOR_Y, z);
      to.set(
        x + Math.cos(around) * reach,
        FLOOR_Y + height * (0.55 + 0.35 * random()),
        z + Math.sin(around) * reach
      );
      direction.subVectors(to, from);
      const length = direction.length();
      const twig = new THREE.CylinderGeometry(0.08, 0.28, length, 4);
      twig.applyQuaternion(lean.setFromUnitVectors(upright, direction.normalize()));
      twig.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
      twigs.push(twig);
    }
  });

  const merged = mergeGeometries(twigs);
  twigs.forEach((twig) => twig.dispose());
  return merged;
}

// The tree's own leaf material, with the wind added because this mesh has no bones to move it
function shrubLeafMaterial(treeLeaves, time) {
  const material = treeLeaves.clone();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float swayAmount = max(position.y - (${FLOOR_Y.toFixed(1)}), 0.0) / 9.0;
        float swaySpot = position.x * 0.25 + position.z * 0.2;
        transformed.x += sin(uTime * ${SWAY_SPEED.toFixed(2)} + swaySpot) * ${SWAY.toFixed(2)} * swayAmount;
        transformed.z += cos(uTime * ${(SWAY_SPEED * 0.8).toFixed(2)} + swaySpot) * ${SWAY.toFixed(2)} * swayAmount;`
      );
  };
  return material;
}

export function createPinkShrubs(treeScene) {
  let treeLeaves = null;
  treeScene.traverse((node) => {
    if (node.isMesh && node.material.name === "Leaves") treeLeaves = node;
  });

  let seed = SHRUB_SEED;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const time = { value: 0 };
  const leafGeometry = shrubLeafGeometry(sampleLeafCards(treeLeaves.geometry), random);
  const leafMaterial = shrubLeafMaterial(treeLeaves.material, time);
  const twigGeometry = shrubTwigGeometry(random);
  const twigMaterial = new THREE.MeshLambertMaterial({ color: TWIG_COLOUR });

  const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
  const twigs = new THREE.Mesh(twigGeometry, twigMaterial);
  const group = new THREE.Group();
  group.add(leaves, twigs);
  [leaves, twigs].forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  return {
    group,
    update(delta) {
      if (!REDUCED_MOTION) time.value += delta;
    },
    dispose() {
      leafGeometry.dispose();
      leafMaterial.dispose();
      twigGeometry.dispose();
      twigMaterial.dispose();
    },
  };
}

const LEAF_SHADES = ["#f7a9ae", "#f493a0", "#fac0bf", "#ee8496"];
// A pointed oval lying flat, as a fan of triangles around its first corner
const LEAF_OUTLINE = [
  [0, 1],
  [0.45, 0.35],
  [0.35, -0.6],
  [0, -1],
  [-0.35, -0.6],
  [-0.45, 0.35],
];

function leafGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(LEAF_OUTLINE.flatMap(([x, z]) => [x, 0, z]), 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(LEAF_OUTLINE.flatMap(() => [0, 1, 0]), 3)
  );
  const fan = [];
  for (let i = 1; i < LEAF_OUTLINE.length - 1; i += 1) fan.push(0, i, i + 1);
  geometry.setIndex(fan);
  return geometry;
}

// One mesh and one draw call for all of them. They never move, so they cost nothing per frame.
export function createFallenLeaves(ground, trees) {
  const leaves = scatterFallenLeaves(ground, trees);
  const mesh = new THREE.InstancedMesh(
    leafGeometry(),
    new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }),
    leaves.length
  );
  mesh.receiveShadow = true;

  const shades = LEAF_SHADES.map((shade) => new THREE.Color(shade));
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  leaves.forEach(({ x, y, z, spin, tiltX, tiltZ, size, shade }, i) => {
    position.set(x, y, z);
    rotation.setFromEuler(euler.set(tiltX, spin, tiltZ));
    scale.setScalar(size);
    mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
    mesh.setColorAt(i, shades[shade]);
  });
  return mesh;
}
