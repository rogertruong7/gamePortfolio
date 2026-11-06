import * as THREE from "three";
import {
  BASE_EYES,
  BASE_SKIN,
  BODY_MESH,
  HEAD_MESH,
  OUTFIT_NUMBERS,
  PARTS,
  createLookMaterial,
  createLookUniforms,
  createPieceMaterial,
} from "./lookMaterial.js";
import { buildPieces } from "./pieces.js";
import { DEFAULT_LOOK, HAIR_COLOURS } from "./lookOptions.js";

const HEAD_BONE = "Head_210_015";
const HIPS_BONE = "Hips_100_03";
const LEFT_ARM_BONE = "LeftArm_510_06";
const ARM_BONES = ["LeftArm_510_06", "RightArm_610_010"];
const LEG_BONES = ["LeftUpLeg_300_022", "RightUpLeg_400_024"];

// Every hairstyle other than the model's own starts from its spiky hair pulled in onto this
// ellipsoid, in the head bone's units. It sits just inside the face, so the fringe that hangs in
// front of the face tucks in behind it, and what's left is a close, tidy head of hair.
const CAP_CENTRE = new THREE.Vector3(0, 4.2, -1.0);
const CAP_RADII = new THREE.Vector3(5.3, 5.6, 4.9);

function boneSet(skeleton, rootNames) {
  const bones = new Set();
  rootNames.forEach((name) => {
    skeleton.bones.find((bone) => bone.name === name)?.traverse((bone) => bones.add(bone));
  });
  return bones;
}

// How much of each vertex is moved by the given bones, from 0 to 1
function belonging(mesh, bones) {
  const { skinIndex, skinWeight } = mesh.geometry.attributes;
  const amounts = new Float32Array(skinIndex.count);
  for (let vertex = 0; vertex < skinIndex.count; vertex += 1) {
    for (let k = 0; k < 4; k += 1) {
      const bone = mesh.skeleton.bones[skinIndex.getComponent(vertex, k)];
      if (bones.has(bone)) amounts[vertex] += skinWeight.getComponent(vertex, k);
    }
  }
  return amounts;
}

// From the mesh's own space into a bone's, in the pose the model was rigged in
function intoBone(mesh, boneName) {
  const index = mesh.skeleton.bones.findIndex((bone) => bone.name === boneName);
  return mesh.skeleton.boneInverses[index].clone().multiply(mesh.bindMatrix);
}

function addCapMorph(mesh) {
  const { geometry } = mesh;
  const toHead = intoBone(mesh, HEAD_BONE);
  const fromHead = toHead.clone().invert();
  const { position, uv } = geometry.attributes;
  const pulledIn = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  const offset = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i);
    if (uv.getX(i) > 0.5) {
      point.applyMatrix4(toHead);
      offset.subVectors(point, CAP_CENTRE);
      const reach = Math.hypot(
        offset.x / CAP_RADII.x,
        offset.y / CAP_RADII.y,
        offset.z / CAP_RADII.z
      );
      if (reach > 1) point.copy(CAP_CENTRE).addScaledVector(offset, 1 / reach);
      point.applyMatrix4(fromHead);
    }
    point.toArray(pulledIn, i * 3);
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute("position", new THREE.BufferAttribute(pulledIn, 3));
  shape.setIndex(geometry.index);
  shape.computeVertexNormals();
  geometry.morphAttributes.position = [shape.attributes.position];
  geometry.morphAttributes.normal = [shape.attributes.normal];
  geometry.morphTargetsRelative = false;
}

// Where each body vertex sits in the rest pose, measured from the hips, and whether it belongs to
// an arm or a leg. The shader paints outfits from these.
function addBodyMap(mesh) {
  const { geometry } = mesh;
  const toHips = intoBone(mesh, HIPS_BONE);
  const { position } = geometry.attributes;
  const rest = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i).applyMatrix4(toHips).toArray(rest, i * 3);
  }
  const arm = belonging(mesh, boneSet(mesh.skeleton, ARM_BONES));
  const leg = belonging(mesh, boneSet(mesh.skeleton, LEG_BONES));
  const limb = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    limb[i * 2] = arm[i];
    limb[i * 2 + 1] = leg[i];
  }
  geometry.setAttribute("aRest", new THREE.BufferAttribute(rest, 3));
  geometry.setAttribute("aLimb", new THREE.BufferAttribute(limb, 2));
}

// Runs once per geometry, which every copy of the character shares. It has to happen before any
// mesh using the geometry is drawn or copied, so that each one picks up the morph target.
function prepareGeometry(mesh) {
  const { geometry } = mesh;
  if (geometry.userData.lookReady) return;
  geometry.userData.lookReady = true;
  // The model has no normals. The shaders use them to shade the parts they repaint.
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  // For emotes that bring the left arm up over the face (emotes.js)
  geometry.setAttribute(
    "aLeftArm",
    new THREE.BufferAttribute(belonging(mesh, boneSet(mesh.skeleton, [LEFT_ARM_BONE])), 1)
  );
  if (mesh.name === HEAD_MESH) addCapMorph(mesh);
  if (mesh.name === BODY_MESH) addBodyMap(mesh);
}

const BLACK_HAIR = HAIR_COLOURS[0].id;

// Gives a copy of the character model its own materials, so it can wear any look. Calling it again
// on the same model hands back the same dressing.
export function dressCharacter(scene) {
  if (scene.userData.dress) return scene.userData.dress;

  const meshes = [];
  scene.traverse((node) => {
    if (node.isSkinnedMesh && PARTS[node.name] !== undefined) meshes.push(node);
  });
  meshes.forEach(prepareGeometry);

  const uniforms = createLookUniforms();
  meshes.forEach((mesh) => {
    mesh.material = createLookMaterial(mesh.material, PARTS[mesh.name], uniforms);
    mesh.updateMorphTargets();
  });
  const head = meshes.find((mesh) => mesh.name === HEAD_MESH);

  const materials = {
    hair: createPieceMaterial("#000", { gold: uniforms.uGold }),
    main: createPieceMaterial("#000"),
    extra: createPieceMaterial("#000"),
    dark: createPieceMaterial("#1a1416"),
    pink: createPieceMaterial("#f4a7b9"),
    yellow: createPieceMaterial("#f6d35b"),
    white: createPieceMaterial("#f4f4f0"),
  };
  const bones = {
    head: scene.getObjectByName(HEAD_BONE),
    hips: scene.getObjectByName(HIPS_BONE),
  };
  let attached = [];

  const dress = {
    uniforms,
    apply(look) {
      const ownHair = look.hair === "spiky";
      head.morphTargetInfluences[0] = ownHair ? 0 : 1;
      // The model's own black hair is left exactly as it was painted
      uniforms.uHairTint.value = ownHair && look.hairColour === BLACK_HAIR ? 0 : 1;
      uniforms.uHairColour.value.set(look.hairColour);
      uniforms.uSkin.value.set(look.skin);
      uniforms.uSkinTint.value = look.skin === BASE_SKIN ? 0 : 1;
      uniforms.uEyes.value.set(look.eyes);
      uniforms.uEyeTint.value = look.eyes === BASE_EYES ? 0 : 1;
      uniforms.uOutfit.value = OUTFIT_NUMBERS[look.outfit] ?? 0;
      uniforms.uMain.value.set(look.main);
      uniforms.uSecond.value.set(look.second);

      materials.hair.color.set(look.hairColour);
      materials.main.color.set(look.main);
      materials.extra.color.set(look.extraColour);

      attached.forEach((piece) => piece.removeFromParent());
      attached = buildPieces(look, materials);
      attached.forEach((piece) => bones[piece.userData.bone].add(piece));
    },
    // Frees what's on the graphics card. The dressing still works afterwards, and its
    // materials upload again if they're drawn, which is what React's development remounts need.
    dispose() {
      meshes.forEach((mesh) => mesh.material.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
  scene.userData.dress = dress;
  dress.apply(DEFAULT_LOOK);
  return dress;
}
