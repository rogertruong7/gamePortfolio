import * as THREE from "three";

export class RotatedBox {
  constructor(x1, z1, x2, z2, thickness = 7) {
    this.cx = (x1 + x2) / 2;
    this.cz = (z1 + z2) / 2;
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    this.halfW = len / 2;
    this.halfD = thickness / 2;
    this.angle = Math.atan2(dz, dx);
    this.cos = Math.cos(this.angle);
    this.sin = Math.sin(this.angle);
  }

  intersectsSphere(sphere) {
    const dx = sphere.center.x - this.cx;
    const dz = sphere.center.z - this.cz;
    const localX = dx * this.cos + dz * this.sin;
    const localZ = -dx * this.sin + dz * this.cos;
    const clampedX = Math.max(-this.halfW, Math.min(localX, this.halfW));
    const clampedZ = Math.max(-this.halfD, Math.min(localZ, this.halfD));
    const distSq = (localX - clampedX) ** 2 + (localZ - clampedZ) ** 2;
    return distSq <= sphere.radius * sphere.radius;
  }

  closestPoint(pos) {
    const dx = pos.x - this.cx;
    const dz = pos.z - this.cz;
    const localX = dx * this.cos + dz * this.sin;
    const localZ = -dx * this.sin + dz * this.cos;
    const clampedX = Math.max(-this.halfW, Math.min(localX, this.halfW));
    const clampedZ = Math.max(-this.halfD, Math.min(localZ, this.halfD));
    return new THREE.Vector3(
      this.cx + clampedX * this.cos - clampedZ * this.sin,
      pos.y,
      this.cz + clampedX * this.sin + clampedZ * this.cos
    );
  }
}

export const pondEdges = [
  new RotatedBox(134.4, -109.4, 135.8, -121.3),
  new RotatedBox(135.8, -121.3, 152.0, -134.9),
  new RotatedBox(152.0, -134.9, 167.4, -134.9),
  new RotatedBox(167.4, -134.9, 183.6, -121.3),
  new RotatedBox(183.6, -121.3, 185.1, -109.4),
  new RotatedBox(185.1, -109.4, 183.3, -87.2),
  new RotatedBox(183.3, -87.2, 184.2, -74.8),
  new RotatedBox(184.2, -74.8, 171.9, -58.6),
  new RotatedBox(171.9, -58.6, 147.5, -58.6),
  new RotatedBox(147.5, -58.6, 135.3, -74.8),
  new RotatedBox(135.3, -74.8, 136.1, -87.2),
  new RotatedBox(136.1, -87.2, 134.4, -109.4),
];

export const invisWalls = [
  new THREE.Box3(
    new THREE.Vector3(0, -21, -190),
    new THREE.Vector3(560, 31, -190)
  ),
  new THREE.Box3(
    new THREE.Vector3(70, -21, -300),
    new THREE.Vector3(70, 31, 104)
  ),
  new THREE.Box3(
    new THREE.Vector3(217, -21, -300),
    new THREE.Vector3(217, 31, 104)
  ),
  new THREE.Box3(
    new THREE.Vector3(0, -21, -22),
    new THREE.Vector3(560, 31, -22)
  ),
];

export const labels = [
  { text: "projects", position: [38, 90, -90], fontSize: 10 },
  { text: "about me", position: [38, 70, -164], fontSize: 10 },
  { text: "experience", position: [92, 75, -210], fontSize: 8 },
  { text: "skills", position: [170, 75, -210], fontSize: 10 },
];

export const showcases = [
  {
    showcaseName: "aboutMe",
    box: new THREE.Box3(
      new THREE.Vector3(50, -50, -190),
      new THREE.Vector3(100, 50, -136)
    ),
  },
  {
    showcaseName: "projects",
    box: new THREE.Box3(
      new THREE.Vector3(50, -50, -120),
      new THREE.Vector3(100, 50, -13)
    ),
  },
  {
    showcaseName: "experiences",
    box: new THREE.Box3(
      new THREE.Vector3(70, -50, -190),
      new THREE.Vector3(125, 50, -160)
    ),
  },
  {
    showcaseName: "skills",
    box: new THREE.Box3(
      new THREE.Vector3(172, -50, -190),
      new THREE.Vector3(215, 50, -160)
    ),
  },
];




// const result = useThree();

// useEffect(() => {
//   const helpers = []; // Array to store helpers

//   invisWalls.forEach((box) => {
//     const helper = new THREE.Box3Helper(box, 0xff0000); // Red color for the helper
//     result.scene.add(helper);
//     helpers.push(helper); // Store the helper
//   });

//   return () => {
//     // Clean up helpers on unmount
//     helpers.forEach((helper) => {
//       result.scene.remove(helper); // Remove each helper
//     });
//   };
// }, [result.scene]);
