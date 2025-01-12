import "../public/style.css";
import * as THREE from "three";
import { initGame, updateGame } from "./game.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/Addons.js";
import { updateInfoGame } from "./projects.js";

// Select the canvas and set up the renderer

const canvas = document.querySelector("#gameCanvas");
export const renderer = new THREE.WebGLRenderer({ canvas });

renderer.setClearColor(0xfad998, 1); // fad998
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Shadow quality
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
export const scene = new THREE.Scene();
export const CAMERA_OFFSET = new THREE.Vector3(160, 120, 160);

document.body.style.cursor = "grab";

// // Create a spherical grid
// const radius = 500; // Radius of the sphere
// const gridDivisions = 36; // Number of grid lines (can adjust for more or less)

// function createSphericalGrid(radius, divisions) {
//     const gridMaterial = new THREE.LineBasicMaterial({
//         color: 0xffffff,
//         opacity: 0.5,
//         transparent: true,
//     });

//     // Create a group to hold the grid lines
//     const gridGroup = new THREE.Group();

//     // Create horizontal circles (latitudes)
//     for (let i = 0; i <= divisions; i++) {
//         const lat = (Math.PI * i) / divisions - Math.PI / 2; // Latitude (ranging from -pi/2 to pi/2)
//         const geometry = new THREE.BufferGeometry();
//         const positions = [];

//         for (let j = 0; j <= divisions; j++) {
//             const lon = (2 * Math.PI * j) / divisions; // Longitude (ranging from 0 to 2pi)
//             const x = radius * Math.cos(lat) * Math.cos(lon);
//             const y = radius * Math.sin(lat);
//             const z = radius * Math.cos(lat) * Math.sin(lon);
//             positions.push(x, y, z); // Add each vertex to the positions array
//         }

//         geometry.setAttribute(
//             "position",
//             new THREE.Float32BufferAttribute(positions, 3)
//         ); // Set the positions attribute
//         const line = new THREE.Line(geometry, gridMaterial);
//         gridGroup.add(line);
//     }

//     // Create vertical circles (longitudes)
//     for (let i = 0; i <= divisions; i++) {
//         const lon = (2 * Math.PI * i) / divisions; // Longitude (ranging from 0 to 2pi)
//         const geometry = new THREE.BufferGeometry();
//         const positions = [];

//         for (let j = 0; j <= divisions; j++) {
//             const lat = (Math.PI * j) / divisions - Math.PI / 2; // Latitude (ranging from -pi/2 to pi/2)
//             const x = radius * Math.cos(lat) * Math.cos(lon);
//             const y = radius * Math.sin(lat);
//             const z = radius * Math.cos(lat) * Math.sin(lon);
//             positions.push(x, y, z); // Add each vertex to the positions array
//         }

//         geometry.setAttribute(
//             "position",
//             new THREE.Float32BufferAttribute(positions, 3)
//         ); // Set the positions attribute
//         const line = new THREE.Line(geometry, gridMaterial);
//         gridGroup.add(line);
//     }

//     // Add the group to the scene
//     scene.add(gridGroup);

//     return gridGroup; // Return the group for further manipulation
// }

// // Create the grid and move it
// const gridGroup = createSphericalGrid(radius, gridDivisions);
// gridGroup.position.set(120, 0, -120); // Move the grid to a new position

////////////////////////////////////////////////
///////////////////// Lights ///////////////////
////////////////////////////////////////////////

const directionalLight = new THREE.DirectionalLight(0xf5d1ab, 2);
directionalLight.position.set(300, 300, 300); // Position the light
directionalLight.castShadow = true; // Enable shadows
directionalLight.shadow.camera.near = 0.5; // Shadow camera near plane
directionalLight.shadow.camera.far = 1200; // Shadow camera far plane
directionalLight.shadow.camera.left = -400; // Set shadow camera left
directionalLight.shadow.camera.right = 400; // Set shadow camera right
directionalLight.shadow.camera.top = 400; // Set shadow camera top
directionalLight.shadow.camera.bottom = -400; // Set shadow camera bottom
scene.add(directionalLight);

// Add an ambient light for base illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

// function createRectAreaLight(
//   color,
//   intensity,
//   width,
//   height,
//   targetPosition,
//   yOffset = 30
// ) {
//   const rectLight = new THREE.RectAreaLight(color, intensity, width, height);
//   rectLight.position.set(
//     targetPosition.x,
//     targetPosition.y + yOffset,
//     targetPosition.z
//   );
//   rectLight.lookAt(targetPosition);
//   scene.add(rectLight);
//   return rectLight;
// }

// // Define lights with their specific configurations
// const lightConfigs = [
//   {
//     color: 0xffffff,
//     intensity: 5,
//     width: 100,
//     height: 50,
//     targetPosition: new THREE.Vector3(40, 20, 270),
//   },
//   {
//     color: 0xffffff,
//     intensity: 5,
//     width: 98,
//     height: 50,
//     targetPosition: new THREE.Vector3(50, 65, 165),
//   },
//   {
//     color: 0xffffff,
//     intensity: 5,
//     width: 100,
//     height: 50,
//     targetPosition: new THREE.Vector3(50, 10, 0),
//   },
//   {
//     color: 0xffffff,
//     intensity: 2,
//     width: 100,
//     height: 50,
//     targetPosition: new THREE.Vector3(240, 10, -60),
//   },
//   {
//     color: 0xffffff,
//     intensity: 5,
//     width: 80,
//     height: 50,
//     targetPosition: new THREE.Vector3(300, 85, -130),
//   },
//   {
//     color: 0xffffff,
//     intensity: 5,
//     width: 100,
//     height: 50,
//     targetPosition: new THREE.Vector3(500, 85, -60),
//   },
//   {
//     color: 0xffffff,
//     intensity: 5,
//     width: 100,
//     height: 50,
//     targetPosition: new THREE.Vector3(430, 85, -60),
//   },
//   {
//     color: 0xffffff,
//     intensity: 4,
//     width: 80,
//     height: 70,
//     targetPosition: new THREE.Vector3(420, 0, 100),
//   },
// ];

// // Create lights using the reusable function
// lightConfigs.forEach((config) => {
//   createRectAreaLight(
//     config.color,
//     config.intensity,
//     config.width,
//     config.height,
//     config.targetPosition
//   );
// });

////////////////////////////////////////////////
/////////////////// Game ///////////////////////
////////////////////////////////////////////////

// Store reference to the player character
let playerCharacter;
const sharedState = { mixer: null };
let currentScene = scene;
let mainScene = scene;

const clock = new THREE.Clock();
function setup() {
  playerCharacter = initGame(sharedState); // Adjusted to return the player character
}

setup();
let result;
// Animation loop
export function animate() {
  requestAnimationFrame(animate);
  // Update camera position smoothly

  if (currentScene === scene) {
    result = updateGame();
    playerCharacter = result.character;
    currentScene = result.currentScene;
    const delta = clock.getDelta(); // Time since the last frame
    renderer.render(currentScene, result.camera);
    if (sharedState.mixer) sharedState.mixer.update(delta);
  } else {
    result = updateInfoGame();
    renderer.render(currentScene, result.camera);
  }
}

animate();

resetButton.addEventListener("click", (e) => {
  currentScene = mainScene;
});

document.getElementById("back_button").addEventListener("click", () => {
  currentScene = mainScene;
});

////////////////////////////////////////////////
/////////////// Window Changes /////////////////
////////////////////////////////////////////////

// Resize listener
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});
