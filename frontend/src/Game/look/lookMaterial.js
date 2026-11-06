import * as THREE from "three";

// The model is unlit, with its shading painted into one texture that all four meshes share. These
// materials keep that texture and repaint parts of it from a character's look: the hair, skin and
// eyes are recoloured, and the body can be painted with a whole new outfit.

// Which mesh is which. The hair uses the right half of the texture, which is otherwise solid black.
export const PARTS = {
  Object_50: 0, // mouth and brows
  Object_52: 1, // eyes
  Object_54: 2, // face, ears and hair
  Object_56: 3, // body
};
export const HEAD_MESH = "Object_54";
export const BODY_MESH = "Object_56";

// The skin colour painted into the texture, and the outfits by number for the shader
export const BASE_SKIN = "#f2c3a1";
export const BASE_EYES = "#2f86d6";
export const OUTFIT_NUMBERS = {
  original: 0,
  tee: 1,
  hoodie: 2,
  dress: 3,
  overalls: 4,
  suit: 5,
  sailor: 6,
  yukata: 7,
};

// How much nearer to the camera the left arm counts as being during an emote that puts it over the
// face (see emotes.js), in the depth buffer's own units. Enough to get past the head, and little
// enough that it still goes behind anything well in front of it.
const IN_FRONT_DEPTH = 0.0006;

export function createLookUniforms() {
  return {
    uLeftArmInFront: { value: 0 },
    // Beating Sans turns the hair gold (SuperSaiyan.jsx)
    uGold: { value: 0 },
    uHairColour: { value: new THREE.Color() },
    uHairTint: { value: 0 },
    uBaseSkin: { value: new THREE.Color(BASE_SKIN) },
    uSkin: { value: new THREE.Color(BASE_SKIN) },
    uSkinTint: { value: 0 },
    uEyes: { value: new THREE.Color(BASE_EYES) },
    uEyeTint: { value: 0 },
    uOutfit: { value: 0 },
    uMain: { value: new THREE.Color() },
    uSecond: { value: new THREE.Color() },
  };
}

const VERTEX_HEAD = `
attribute float aLeftArm;
uniform float uLeftArmInFront;
varying float vShade;
#if LOOK_PART == 3
attribute vec3 aRest;
attribute vec2 aLimb;
varying vec3 vRest;
varying vec2 vLimb;
#endif`;

const VERTEX_BODY = `
gl_Position.z -= aLeftArm * uLeftArmInFront * ${IN_FRONT_DEPTH.toFixed(5)} * gl_Position.w;
// How much this point faces up the screen. The texture has its own shading, so this only shades
// the parts that get repainted.
vShade = normalize(normalMatrix * objectNormal).y * 0.5 + 0.5;
#if LOOK_PART == 3
vRest = aRest;
vLimb = aLimb;
#endif`;

const FRAGMENT_HEAD = `
uniform float uGold;
uniform vec3 uHairColour;
uniform float uHairTint;
uniform vec3 uBaseSkin;
uniform vec3 uSkin;
uniform float uSkinTint;
uniform vec3 uEyes;
uniform float uEyeTint;
uniform float uOutfit;
uniform vec3 uMain;
uniform vec3 uSecond;
varying float vShade;
#if LOOK_PART == 3
varying vec3 vRest;
varying vec2 vLimb;
#endif

float lookShade(float low, float high) {
  return mix(low, high, smoothstep(0.1, 0.9, vShade));
}

// The face is all skin, blush and lines, so all of it takes the new tone. That keeps the blush and
// mouth in proportion to it.
vec3 tintFace(vec3 colour) {
  return mix(colour, colour * uSkin / uBaseSkin, uSkinTint);
}

// The body's texture has clothes too, so only what's close to the skin colour changes
vec3 tintSkin(vec3 colour) {
  float closeness = 1.0 - smoothstep(0.05, 0.16, distance(colour, uBaseSkin));
  return mix(colour, colour * uSkin / uBaseSkin, closeness * uSkinTint);
}

vec3 goldHair(vec3 colour) {
  vec3 gold = mix(vec3(0.85, 0.42, 0.02), vec3(1.0, 0.86, 0.16), smoothstep(0.15, 0.75, vShade));
  return mix(colour, gold, uGold);
}

#if LOOK_PART == 3
// Measured on the model in its rest pose, in the hips bone's units, where +y is up, +z is forward
// and x is across. The arms hang out to the sides, so how far out a point is says how far down
// the arm it is.
const float SHOE_TOP = -1.98;
const float SOLE_TOP = -2.17;
const float KNEE = -1.38;
const float SHORTS_HEM = -0.85;
const float WAIST = 0.95;
const float NECK = 2.95;
const float SHORT_SLEEVE = 1.5;
const float WRIST = 2.42;

float band(float value, float from, float to) {
  return step(from, value) * step(value, to);
}

vec3 dressBody(vec3 painted) {
  if (uOutfit < 0.5) return tintSkin(painted);

  float y = vRest.y;
  float x = vRest.x;
  float across = abs(x);
  bool front = vRest.z > 0.15;
  bool arm = vLimb.x > 0.5;
  bool leg = vLimb.y > 0.5;
  bool hand = arm && across > WRIST;
  bool shoe = leg && y < SHOE_TOP;
  bool lower = !arm && (leg || y < WAIST);

  vec3 skin = uSkin;
  vec3 white = vec3(0.9);
  vec3 darkShoe = vec3(0.045, 0.035, 0.035);
  vec3 colour = skin;

  if (uOutfit < 1.5) {
    // Tee and shorts, with trainers
    if (arm) colour = across < SHORT_SLEEVE ? uMain : skin;
    else if (lower) colour = (leg && y < SHORTS_HEM) ? skin : uSecond;
    else colour = y > NECK - 0.12 ? uMain * 0.8 : uMain;
    if (shoe) colour = y < SOLE_TOP ? vec3(0.25) : white;
  } else if (uOutfit < 2.5) {
    // Hoodie with a front pocket and drawstrings, over trousers
    if (arm) colour = across < WRIST - 0.16 ? uMain : (across < WRIST ? uMain * 0.75 : skin);
    else if (lower) colour = y < WAIST && y > WAIST - 0.25 && !leg ? uMain * 0.75 : uSecond;
    else {
      colour = uMain;
      if (front && across < 0.8 && band(y, 1.05, 1.6) > 0.5) colour = uMain * 0.82;
      if (front && band(across, 0.22, 0.32) > 0.5 && band(y, 2.2, 2.9) > 0.5) colour = white;
    }
    if (leg && y > WAIST) colour = uMain * 0.75;
    if (shoe) colour = y < SOLE_TOP ? vec3(0.9) : vec3(0.12);
  } else if (uOutfit < 3.5) {
    // Dress, with puffed sleeves and a sash. The skirt is its own piece.
    if (arm) colour = across < 1.25 ? uMain : skin;
    else if (leg) colour = skin;
    else colour = band(y, 1.2, 1.45) > 0.5 ? uSecond : uMain;
    if (shoe) colour = vec3(0.12, 0.05, 0.05);
  } else if (uOutfit < 4.5) {
    // Overalls over a tee
    if (arm) colour = across < SHORT_SLEEVE ? uSecond : skin;
    else if (lower) colour = uMain;
    else {
      colour = uSecond;
      bool bib = front && across < 0.8 && y < 2.55;
      bool strap = band(across, 0.42, 0.72) > 0.5;
      if (bib || strap || y < WAIST + 0.35) colour = uMain;
      if (front && distance(vec2(across, y), vec2(0.57, 2.42)) < 0.13) colour = vec3(0.95, 0.8, 0.3);
    }
    if (shoe) colour = darkShoe;
  } else if (uOutfit < 5.5) {
    // Suit with a shirt and tie
    if (arm) colour = across < WRIST - 0.1 ? uMain : (across < WRIST ? white : skin);
    else if (lower) colour = uMain * 0.85;
    else {
      colour = uMain;
      bool opening = front && y > 1.2 && across < (y - 1.2) * 0.42;
      if (opening) colour = across < 0.11 ? uSecond : white;
    }
    if (shoe) colour = darkShoe;
  } else if (uOutfit < 6.5) {
    // Sailor uniform: white top with a big collar, and a pleated skirt as its own piece
    if (arm) colour = across < WRIST - 0.16 ? white : (across < WRIST ? uMain : skin);
    else if (leg) colour = y < KNEE - 0.1 ? white : skin;
    else {
      colour = white;
      bool collar = !front ? y > 2.25 : (y > 1.7 && across > (y - 1.7) * 0.55);
      if (collar) colour = band(y, 2.25, 2.35) > 0.5 && !front ? white : uMain;
      if (front && across < 0.32 && band(y, 1.55, 1.85) > 0.5) colour = uSecond;
    }
    if (shoe) colour = vec3(0.12, 0.06, 0.04);
  } else {
    // Yukata, with a pattern of dots, an obi and the robe folded over at the front
    float dots = step(0.86, sin(vRest.x * 11.0 + vRest.z * 7.0) * sin(vRest.y * 11.0));
    colour = mix(uMain, uSecond, dots * 0.8);
    if (arm && across > WRIST) colour = skin;
    if (!arm && !leg && band(y, 0.9, 1.5) > 0.5) colour = uSecond;
    if (!arm && front && y > 1.5 && abs(x + (y - 2.9) * 0.45) < 0.08) colour = uMain * 0.6;
    if (shoe) colour = y < SOLE_TOP ? vec3(0.35, 0.22, 0.12) : skin;
  }

  if (hand && uOutfit > 0.5) colour = skin;
  return colour * lookShade(0.74, 1.08);
}
#endif`;

const FRAGMENT_BODY = `
#if LOOK_PART == 2
if (vMapUv.x > 0.5) {
  if (uHairTint > 0.5) diffuseColor.rgb = uHairColour * lookShade(0.55, 1.2);
  diffuseColor.rgb = goldHair(diffuseColor.rgb);
} else {
  diffuseColor.rgb = tintFace(diffuseColor.rgb);
}
#elif LOOK_PART == 1
// The irises are the only blue in the texture. Their light and dark is kept in the new colour.
float blueness = smoothstep(0.06, 0.22, diffuseColor.b - max(diffuseColor.r, diffuseColor.g));
vec3 recoloured = uEyes * clamp(diffuseColor.b / 0.55, 0.15, 1.6);
diffuseColor.rgb = mix(diffuseColor.rgb, recoloured, blueness * uEyeTint);
#elif LOOK_PART == 0
diffuseColor.rgb = tintFace(diffuseColor.rgb);
#else
diffuseColor.rgb = dressBody(diffuseColor.rgb);
#endif`;

// A copy of the model's material for one mesh, drawing one character's look
export function createLookMaterial(original, part, uniforms) {
  const material = original.clone();
  material.defines = { ...material.defines, LOOK_PART: part };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
      .replace("#include <map_fragment>", `#include <map_fragment>\n${FRAGMENT_BODY}`);
  };
  // Every character's copy compiles to the same program, so they share it
  material.customProgramCacheKey = () => `look-${part}`;
  return material;
}

// For the pieces added on top of the model: flat colour, shaded by which way it faces, like the
// painted texture. The inside of an open piece, like a skirt or a curtain of hair, is darker.
export function createPieceMaterial(colour, { gold = null } = {}) {
  const material = new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide });
  const goldUniform = gold ?? { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGold = goldUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vShade;\nvarying float vSide;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec3 viewNormal = normalize(normalMatrix * normal);
        vShade = viewNormal.y * 0.5 + 0.5;
        vSide = viewNormal.x;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vShade;\nvarying float vSide;\nuniform float uGold;"
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // Lit a little from the left as well as from above, so strands and folds catch the light
        float pieceShade = mix(0.58, 1.18, smoothstep(0.1, 0.9, vShade)) * (0.94 - vSide * 0.1);
        vec3 gold = mix(vec3(0.85, 0.42, 0.02), vec3(1.0, 0.86, 0.16), smoothstep(0.15, 0.75, vShade));
        diffuseColor.rgb = mix(diffuseColor.rgb, gold, uGold) * pieceShade;
        if (!gl_FrontFacing) diffuseColor.rgb *= 0.6;`
      );
  };
  material.customProgramCacheKey = () => "look-piece";
  return material;
}
