import * as THREE from "three";

// The extra shapes a look can add: hair, skirts and things to wear on the head. Each is built from
// simple shapes in the space of the bone it hangs from, so it moves with the head or the hips.
//
// In the head bone's units the face is about 9.4 wide, from y = -0.3 at the chin to 5.8 at the
// forehead, and faces +z with its front at about z = 3.1. In the hips bone's units the waist is at
// y = 1 and the hips are about 2.9 wide. +x is the character's left.

// Shapes never change, so every character shares them
const geometries = new Map();
function shape(key, build) {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key);
}

function mesh(geometry, material, { at = [0, 0, 0], turn = [0, 0, 0], size = [1, 1, 1] } = {}) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(...at);
  part.rotation.set(...turn);
  part.scale.set(...size);
  part.userData.lookPiece = true;
  return part;
}

function piece(bone, ...parts) {
  const group = new THREE.Group();
  group.userData.bone = bone;
  parts.forEach((part) => group.add(part));
  return group;
}

// A curtain of hair around the back and sides of the head, open at the front for the face. It
// starts tucked inside the close hair on the crown and comes out from under it, so the two read as
// one head of hair. Then it hangs straight down, in strands that end in pointed locks.
const SHELL_PROFILE = [
  [3.5, 8.0],
  [4.3, 7.2],
  [4.95, 6.3],
  [5.45, 5.3],
  [5.75, 4.2],
];
const STRANDS = 26;
const LOCKS = 13;

function hairShell(bottom, openDegrees, flare = 0, lockLength = 1.8) {
  const points = SHELL_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
  const [radius, widest] = SHELL_PROFILE[SHELL_PROFILE.length - 1];
  const steps = 10;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const curl = t > 0.8 ? (t - 0.8) * 2.2 : 0;
    points.push(new THREE.Vector2(radius + flare * t - curl, widest + (bottom - widest) * t));
  }
  const open = THREE.MathUtils.degToRad(openDegrees);
  const geometry = new THREE.LatheGeometry(points, 96, open, Math.PI * 2 - open * 2);

  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i);
    const angle = Math.atan2(point.x, point.z);
    // Strands only show once the hair is out from under the crown
    const hanging = THREE.MathUtils.smoothstep(point.y, 6.8, 5.2);
    const strands = Math.sin(angle * STRANDS) * 0.075 + Math.sin(angle * STRANDS * 2.3 + 1.7) * 0.03;
    point.x *= 1 + strands * hanging;
    point.z *= 1 + strands * hanging;
    // The last stretch splits into locks that come to a point
    const end = THREE.MathUtils.smoothstep(point.y, bottom + (widest - bottom) * 0.35, bottom);
    point.y -= end * lockLength * (0.5 + 0.5 * Math.cos(angle * LOCKS));
    position.setXYZ(i, point.x, point.y, point.z);
  }

  // Deeper than it is wide, like the head, and centred over the back of the skull
  geometry.scale(1, 1, 0.9);
  geometry.translate(0, 0, -1.0);
  geometry.computeVertexNormals();
  return geometry;
}

// A tube that narrows along a curve, for tails of hair
function taperedTube(points, startRadius, endRadius) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const segments = 24;
  const sides = 12;
  const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
  const position = geometry.attributes.position;
  const centre = new THREE.Vector3();
  const point = new THREE.Vector3();
  for (let ring = 0; ring <= segments; ring += 1) {
    const t = ring / segments;
    curve.getPointAt(t, centre);
    // Full near the top, then tapering to a soft point
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, t) * (1 + Math.sin(t * Math.PI) * 0.35);
    for (let side = 0; side <= sides; side += 1) {
      const index = ring * (sides + 1) + side;
      point.fromBufferAttribute(position, index).sub(centre).multiplyScalar(radius).add(centre);
      position.setXYZ(index, point.x, point.y, point.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

const sphere = () => shape("sphere", () => new THREE.SphereGeometry(1, 20, 14));
const ring = () => shape("ring", () => new THREE.TorusGeometry(1, 0.32, 8, 20));
// The top half of a sphere, for hats
const dome = () =>
  shape("dome", () => new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2));

function tie(material, at, turn) {
  return mesh(ring(), material, { at, turn, size: [0.9, 0.9, 0.9] });
}

function hairPieces(look, materials) {
  const hair = materials.hair;
  switch (look.hair) {
    case "bob":
      return [piece("head", mesh(shape("bob", () => hairShell(0.4, 62, 0.25, 1.0)), hair))];
    case "long":
      return [piece("head", mesh(shape("long", () => hairShell(-1.9, 60, 0.35)), hair))];
    case "ponytail":
      return [
        piece(
          "head",
          mesh(
            shape("ponytail", () =>
              taperedTube(
                [
                  [0, 7.8, -5.0],
                  [0, 7.6, -7.6],
                  [0, 4.6, -8.6],
                  [0, 1.2, -8.0],
                ],
                1.9,
                0.45
              )
            ),
            hair
          ),
          tie(materials.extra, [0, 7.85, -5.6], [0.15, 0, 0])
        ),
      ];
    case "twintails":
      return [-1, 1].map((side) =>
        piece(
          "head",
          mesh(
            shape(`twintail${side}`, () =>
              taperedTube(
                [
                  [side * 4.4, 7.7, -2.3],
                  [side * 5.9, 7.3, -2.6],
                  [side * 6.3, 4.2, -2.5],
                  [side * 5.7, 1.0, -2.0],
                ],
                1.6,
                0.4
              )
            ),
            hair
          ),
          tie(materials.extra, [side * 5.0, 7.6, -2.4], [0, Math.PI / 2, 0.25 * side])
        )
      );
    case "bun":
      return [
        piece(
          "head",
          mesh(sphere(), hair, { at: [0, 9.7, -3.3], size: [2.2, 2.0, 2.0] }),
          tie(materials.extra, [0, 8.5, -2.9], [Math.PI / 2 - 0.5, 0, 0])
        ),
      ];
    default:
      return [];
  }
}

function extraPieces(look, materials) {
  const extra = materials.extra;
  switch (look.extra) {
    case "bow":
      return [
        piece(
          "head",
          mesh(sphere(), extra, { at: [-1.3, 0, 0], size: [1.5, 1.05, 0.55], turn: [0, 0, 0.25] }),
          mesh(sphere(), extra, { at: [1.3, 0, 0], size: [1.5, 1.05, 0.55], turn: [0, 0, -0.25] }),
          mesh(sphere(), extra, { size: [0.6, 0.6, 0.6] })
        ),
      ].map((bow) => {
        bow.position.set(3.4, 9.0, 0.3);
        bow.rotation.set(-0.15, 0.3, -0.55);
        return bow;
      });
    case "catEars":
      return [-1, 1].map((side) => {
        const ear = piece(
          "head",
          mesh(shape("ear", () => new THREE.ConeGeometry(1.6, 3.0, 4)), materials.hair),
          mesh(shape("innerEar", () => new THREE.ConeGeometry(0.95, 2.0, 4)), materials.pink, {
            at: [0, -0.2, 0.55],
          })
        );
        ear.position.set(side * 3.5, 9.2, -0.9);
        ear.rotation.set(-0.12, 0, -side * 0.4);
        return ear;
      });
    case "cap":
      return [
        piece(
          "head",
          mesh(dome(), extra, { at: [0, 6.6, -1.0], size: [5.95, 4.0, 5.45] }),
          mesh(
            shape("capBrim", () => new THREE.CylinderGeometry(1, 1, 0.3, 24, 1, false, -Math.PI / 2, Math.PI)),
            extra,
            { at: [0, 6.75, 3.0], size: [4.2, 1, 3.1], turn: [0.12, 0, 0] }
          ),
          mesh(sphere(), extra, { at: [0, 10.6, -1.0], size: [0.55, 0.4, 0.55] })
        ),
      ];
    case "beanie":
      return [
        piece(
          "head",
          mesh(dome(), extra, { at: [0, 6.2, -1.0], size: [6.0, 5.1, 5.5] }),
          mesh(
            shape("beanieBand", () => new THREE.CylinderGeometry(1, 1, 1, 28, 1, true)),
            extra,
            { at: [0, 6.6, -1.0], size: [6.15, 1.2, 5.65] }
          ),
          mesh(sphere(), materials.white, { at: [0, 11.6, -1.2], size: [1.2, 1.2, 1.2] })
        ),
      ];
    case "flower": {
      const petals = [0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return mesh(sphere(), extra, {
          at: [Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, 0],
          size: [0.85, 0.85, 0.4],
        });
      });
      const flower = piece("head", ...petals, mesh(sphere(), materials.yellow, { size: [0.55, 0.55, 0.45], at: [0, 0, 0.2] }));
      flower.position.set(4.6, 7.2, 1.3);
      flower.rotation.set(0, 0.9, 0);
      return [flower];
    }
    case "glasses": {
      const lens = shape("lens", () => new THREE.TorusGeometry(1.45, 0.17, 8, 28));
      return [
        piece(
          "head",
          mesh(lens, extra, { at: [-1.5, 2.65, 3.45] }),
          mesh(lens, extra, { at: [1.5, 2.65, 3.45] }),
          mesh(shape("bridge", () => new THREE.CylinderGeometry(0.13, 0.13, 1, 6)), extra, {
            at: [0, 2.9, 3.5],
            turn: [0, 0, Math.PI / 2],
            size: [1, 0.35, 1],
          })
        ),
      ];
    }
    default:
      return [];
  }
}

// A flick of lashes off the outer corner of each eye
function lashPieces(look, materials) {
  if (look.body !== "girl") return [];
  const lash = shape("lash", () => new THREE.ConeGeometry(0.28, 1.3, 4));
  return [-1, 1].map((side) =>
    piece(
      "head",
      mesh(lash, materials.dark, { at: [side * 2.62, 4.05, 2.85], turn: [0, 0, -side * 1.0] }),
      mesh(lash, materials.dark, { at: [side * 2.72, 3.6, 2.75], turn: [0, 0, -side * 1.45], size: [0.8, 0.8, 0.8] })
    )
  );
}

// A flared skirt around the hips. Pleats ripple its hem.
function skirtGeometry(pleats) {
  const geometry = new THREE.CylinderGeometry(1.62, 2.45, 2.05, 48, 4, true);
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i);
    const down = THREE.MathUtils.clamp((1.025 - point.y) / 2.05, 0, 1);
    const angle = Math.atan2(point.z, point.x);
    const ripple = pleats ? 1 + Math.abs(Math.sin(angle * 9)) * 0.09 * down : 1;
    point.x *= ripple;
    point.z *= ripple * 0.78;
    position.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.translate(0, 0.05, 0.02);
  geometry.computeVertexNormals();
  return geometry;
}

function outfitPieces(look, materials) {
  if (look.outfit === "dress") {
    return [piece("hips", mesh(shape("skirt", () => skirtGeometry(false)), materials.main))];
  }
  if (look.outfit === "sailor") {
    return [piece("hips", mesh(shape("pleatedSkirt", () => skirtGeometry(true)), materials.main))];
  }
  return [];
}

export function buildPieces(look, materials) {
  return [
    ...hairPieces(look, materials),
    ...extraPieces(look, materials),
    ...lashPieces(look, materials),
    ...outfitPieces(look, materials),
  ];
}
