import * as THREE from "three";

export const invisWalls = [
  new THREE.Box3(
    new THREE.Vector3(0, -21, -190), // box1Min
    new THREE.Vector3(560, 31, -190) // box1Max
  ),
  new THREE.Box3(
    new THREE.Vector3(70, -21, -300), // box2Min
    new THREE.Vector3(70, 31, 104) // box2Max
  ),
  new THREE.Box3(
    new THREE.Vector3(217, -21, -300), // box2Min
    new THREE.Vector3(217, 31, 104) // box2Max
  ),
  new THREE.Box3(
    new THREE.Vector3(0, -21, -22), // box2Min
    new THREE.Vector3(560, 31, -22) // box2Max
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
