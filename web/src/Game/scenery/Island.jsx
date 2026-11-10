import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  ISLAND_CENTRE,
  edgeBanks,
  edgeDetails,
  gardenRocks,
  islandRings,
  rimRocks,
  undersideRocks,
} from "./islandShape.js";

// A low-poly floating island built in code, sitting under the town. Each triangle gets its own
// colour and its own corners, which is what gives it the flat, faceted look. It adds a few
// thousand triangles and three draw calls, and nothing in it changes after it's built.

// The plain grass colour from the old floor's texture. It's one flat colour on purpose, since
// giving each slice of the top its own shade shows up as stripes running to the middle.
const GRASS = "#44b454";
const GRASS_TEXTURE_SIZE = 256;
// How many world units one copy of the texture covers
const GRASS_TILE_SIZE = 70;
const GRASS_PATCHES = 26;
const GRASS_TUFTS = 420;
const GRASS_EDGE = ["#3f9a43", "#378f3d"];
const DIRT = ["#d8bd7f", "#cdb173", "#c2a568"];
const DEEP_DIRT = ["#b0966a", "#a58b60", "#987f58"];
const STONE = ["#8a8076", "#7a7168", "#6c645c", "#958a7c"];
const MOSS = "#6f9e3c";
// How a rock set into the cliff is squashed: wide across the slope, and shallow out of it
const OUTCROP_WIDTH = 1.25;
const OUTCROP_LENGTH = 0.95;
const OUTCROP_DEPTH = 0.8;
// How far a rock is pushed out of the cliff, as a fraction of its size
const OUTCROP_LIFT = 0.2;
const BANK_COLOURS = {
  plinth: {
    top: ["#7a4a36", "#6d4230", "#86563e"],
    foot: ["#5f7d3c", "#4f8f41", "#6a7a3e"],
  },
  path: {
    top: ["#a89a6a", "#8fa05a", "#9aa062"],
    foot: ["#4fa64a", "#3f9a43", "#5aa850"],
  },
};
const TUFT_BLADES = 3;
const TUFT_WIDTH = 0.4;
const TUFT_COLOURS = ["#3a9a45", "#56c060", "#2f8a3e"];

const _colour = new THREE.Color();
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _facing = new THREE.Vector3();
const _turn = new THREE.Quaternion();

function seededRandom(start) {
  let seed = start;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function pick(random, colours) {
  return colours[Math.floor(random() * colours.length)];
}

// Grass at the top, then dirt, then darker dirt, then bare rock towards the point
function colourAtHeight(random, y) {
  const wobbled = y + (random() - 0.5) * 12;
  if (wobbled > -15) return pick(random, GRASS_EDGE);
  if (wobbled > -60) return pick(random, DIRT);
  if (wobbled > -105) return pick(random, DEEP_DIRT);
  return pick(random, STONE);
}

// Puts a triangle's corners in whichever order makes it face away from `middle`, so it catches
// the light properly from the outside
function facingAwayFrom(addTriangle, middle) {
  return (a, b, c, colour) => {
    const edge1 = [b.x - a.x, b.y - a.y, b.z - a.z];
    const edge2 = [c.x - a.x, c.y - a.y, c.z - a.z];
    const normal = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0],
    ];
    const away =
      normal[0] * ((a.x + b.x + c.x) / 3 - middle.x) +
      normal[1] * ((a.y + b.y + c.y) / 3 - middle.y) +
      normal[2] * ((a.z + b.z + c.z) / 3 - middle.z);
    if (away >= 0) addTriangle(a, b, c, colour);
    else addTriangle(a, c, b, colour);
  };
}

// The slopes that blend the plinths and the path's kerb into the grass: their own colour at the
// top, greener towards the bottom, with small tufts of grass along the foot
function addEdges(addTriangle) {
  const random = seededRandom(2777);
  const upwards = facingAwayFrom(addTriangle, { x: 0, y: -1000, z: 0 });

  for (const { kind, stations } of edgeBanks()) {
    const colours = BANK_COLOURS[kind];
    for (let i = 0; i < stations.length - 1; i += 1) {
      const a = stations[i];
      const b = stations[i + 1];
      upwards(a.wall, b.wall, a.middle, pick(random, colours.top));
      upwards(b.wall, b.middle, a.middle, pick(random, colours.top));
      upwards(a.middle, b.middle, a.outer, pick(random, colours.foot));
      upwards(b.middle, b.outer, a.outer, pick(random, colours.foot));
    }
  }

  for (const { x, y, z, size } of edgeDetails().tufts) {
    for (let blade = 0; blade < TUFT_BLADES; blade += 1) {
      const turn = (blade / TUFT_BLADES) * Math.PI * 2 + random();
      const baseX = x + Math.cos(turn) * 0.7;
      const baseZ = z + Math.sin(turn) * 0.7;
      const corners = [0, 1, 2].map((corner) => {
        const around = turn + (corner / 3) * Math.PI * 2;
        return {
          x: baseX + Math.cos(around) * TUFT_WIDTH,
          y,
          z: baseZ + Math.sin(around) * TUFT_WIDTH,
        };
      });
      const tip = {
        x: baseX + Math.cos(turn) * size * 0.35,
        y: y + size * (0.7 + random() * 0.5),
        z: baseZ + Math.sin(turn) * size * 0.35,
      };
      const outwards = facingAwayFrom(addTriangle, { x: baseX, y: y + size * 0.25, z: baseZ });
      const colour = pick(random, TUFT_COLOURS);
      outwards(corners[0], corners[1], tip, colour);
      outwards(corners[1], corners[2], tip, colour);
      outwards(corners[2], corners[0], tip, colour);
    }
  }
}

function buildIsland() {
  const random = seededRandom(3301);
  const { rings, tip } = islandRings();
  const positions = [];
  const colours = [];

  const addTriangle = (a, b, c, colour) => {
    _colour.set(colour);
    for (const { x, y, z } of [a, b, c]) {
      positions.push(x, y, z);
      colours.push(_colour.r, _colour.g, _colour.b);
    }
  };
  const addSloped = (a, b, c) => {
    addTriangle(a, b, c, colourAtHeight(random, (a.y + b.y + c.y) / 3));
  };

  for (let r = 0; r < rings.length - 1; r += 1) {
    const upper = rings[r];
    const lower = rings[r + 1];
    upper.forEach((point, i) => {
      const next = (i + 1) % upper.length;
      addSloped(point, upper[next], lower[i]);
      addSloped(upper[next], lower[next], lower[i]);
    });
  }

  const last = rings[rings.length - 1];
  last.forEach((point, i) => {
    addSloped(point, last[(i + 1) % last.length], tip);
  });

  addEdges(addTriangle);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// The grass on top, which is the ground the whole town stands on. It has its own mesh because
// it's the one part of the island with a texture, laid flat so it tiles across the whole top.
function buildGrass() {
  const rim = islandRings().rings[0];
  const centre = { x: ISLAND_CENTRE.x, y: rim[0].y, z: ISLAND_CENTRE.z };
  const positions = [];
  const uvs = [];
  rim.forEach((point, i) => {
    for (const { x, y, z } of [centre, rim[(i + 1) % rim.length], point]) {
      positions.push(x, y, z);
      uvs.push(x / GRASS_TILE_SIZE, z / GRASS_TILE_SIZE);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

// Everything is drawn again one tile over in each direction, so it wraps at the tile's edges
function drawWrapped(draw) {
  for (const offsetX of [-GRASS_TEXTURE_SIZE, 0, GRASS_TEXTURE_SIZE]) {
    for (const offsetY of [-GRASS_TEXTURE_SIZE, 0, GRASS_TEXTURE_SIZE]) {
      draw(offsetX, offsetY);
    }
  }
}

// Soft patches of lighter and darker green, with little tufts scattered over them
function paintGrass() {
  const random = seededRandom(6151);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRASS_TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, 0, GRASS_TEXTURE_SIZE, GRASS_TEXTURE_SIZE);

  for (let i = 0; i < GRASS_PATCHES; i += 1) {
    const x = random() * GRASS_TEXTURE_SIZE;
    const y = random() * GRASS_TEXTURE_SIZE;
    const radius = 18 + random() * 46;
    const colour = random() < 0.6 ? "60, 164, 76" : "78, 190, 94";
    drawWrapped((offsetX, offsetY) => {
      const patch = ctx.createRadialGradient(
        x + offsetX, y + offsetY, 0,
        x + offsetX, y + offsetY, radius
      );
      patch.addColorStop(0, `rgba(${colour}, 0.55)`);
      patch.addColorStop(1, `rgba(${colour}, 0)`);
      ctx.fillStyle = patch;
      ctx.fillRect(x + offsetX - radius, y + offsetY - radius, radius * 2, radius * 2);
    });
  }

  for (let i = 0; i < GRASS_TUFTS; i += 1) {
    const x = Math.floor(random() * GRASS_TEXTURE_SIZE);
    const y = Math.floor(random() * GRASS_TEXTURE_SIZE);
    ctx.fillStyle = random() < 0.65 ? "#379a47" : "#5ccb6c";
    // Two short blades leaning away from each other
    drawWrapped((offsetX, offsetY) => {
      ctx.fillRect(x + offsetX, y + offsetY, 1, 3);
      ctx.fillRect(x + offsetX + 2, y + offsetY + 1, 1, 2);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.anisotropy = 4;
  return texture;
}

// An icosahedron with its corners pushed around. Corners shared by several triangles have to
// move together, or the rock would split open.
function buildRock(seed) {
  const random = seededRandom(seed);
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.attributes.position;
  const moved = new Map();

  for (let i = 0; i < position.count; i += 1) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)]
      .map((value) => value.toFixed(3))
      .join();
    if (!moved.has(key)) {
      const push = 0.72 + random() * 0.5;
      moved.set(key, {
        x: position.getX(i) * push,
        y: position.getY(i) * push,
        z: position.getZ(i) * push,
      });
    }
    const { x, y, z } = moved.get(key);
    position.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Paints the faces of a mossy rock that look up at the sky. Rocks are flat-shaded, so each face is
// all moss or all stone, and how far up a face has to look varies from rock to rock.
function growMossOnTop(shader) {
  shader.uniforms.uMoss = { value: new THREE.Color(MOSS) };
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      attribute float aMoss;
      varying float vMoss;`
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float facesUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;
      float mossLine = 0.3 + 0.2 * sin(instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3);
      vMoss = aMoss * step(mossLine, facesUp);`
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      uniform vec3 uMoss;
      varying float vMoss;`
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      diffuseColor.rgb = mix(diffuseColor.rgb, uMoss, vMoss);`
    );
}

function placeRock(rock) {
  _position.set(rock.x, rock.y, rock.z);
  if (rock.facing) {
    // Lies along the cliff with its shallow side facing out, partly buried in the surface
    _facing.set(rock.facing.x, rock.facing.y, rock.facing.z);
    _position.addScaledVector(_facing, rock.size * OUTCROP_LIFT);
    _rotation.setFromUnitVectors(_up, _facing).multiply(_turn.setFromAxisAngle(_up, rock.spin));
    _scale.set(OUTCROP_WIDTH, OUTCROP_DEPTH, OUTCROP_LENGTH).multiplyScalar(rock.size);
  } else {
    _rotation.setFromEuler(_euler.set(rock.spin * 0.3, rock.spin, rock.spin * 0.2));
    _scale.setScalar(rock.size);
  }
  return _matrix.compose(_position, _rotation, _scale);
}

const Island = () => {
  const rocks = useMemo(
    () => [
      ...rimRocks().map((rock) => ({ ...rock, mossy: true })),
      ...undersideRocks(),
      ...edgeDetails().pebbles,
      ...gardenRocks(),
    ],
    []
  );

  const islandGeometry = useMemo(() => buildIsland(), []);
  const grassGeometry = useMemo(() => buildGrass(), []);
  const grassTexture = useMemo(() => paintGrass(), []);
  const rockGeometry = useMemo(() => {
    const geometry = buildRock(4441);
    const moss = Float32Array.from(rocks, (rock) => (rock.mossy ? 1 : 0));
    geometry.setAttribute("aMoss", new THREE.InstancedBufferAttribute(moss, 1));
    return geometry;
  }, [rocks]);

  const rocksRef = useRef();

  useEffect(() => {
    const random = seededRandom(1187);
    rocks.forEach((rock, i) => {
      rocksRef.current.setMatrixAt(i, placeRock(rock));
      // Rocks in the cliff take the wall's colour at their height, so they darken further down
      const colour = rock.facing ? colourAtHeight(random, rock.y) : pick(random, STONE);
      rocksRef.current.setColorAt(i, _colour.set(colour));
    });
    rocksRef.current.instanceMatrix.needsUpdate = true;
    rocksRef.current.instanceColor.needsUpdate = true;
  }, [rocks]);

  return (
    <>
      <mesh geometry={islandGeometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <mesh geometry={grassGeometry} receiveShadow>
        <meshStandardMaterial map={grassTexture} roughness={1} />
      </mesh>
      <instancedMesh
        ref={rocksRef}
        args={[rockGeometry, undefined, rocks.length]}
        frustumCulled={false}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={1} onBeforeCompile={growMossOnTop} />
      </instancedMesh>
    </>
  );
};

export default React.memo(Island);
