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
