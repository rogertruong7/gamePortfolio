import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CAMERA_OFFSET } from "./main";
import { scene, renderer } from "./main";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { initProjectsGame } from "./projects";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

//Hello!
// bye

const SPEED = 0.8; // Movement SPEED
const CAMERA_ROTATION_SPEED = 0.0008;

let character,
  targetPosition,
  clickMoving = false;
let leftBuildings;
let rightBuildings;
// let shop;
let keys = {}; // Track active keys
let floor;
let loading = false;
let mainScene;
let darkSpot;
let startPosition = [93, -8, -134];
let currentScene;
let texts = [];
let doorways = {};
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  3500
);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);


export function updateGame() {
  mainScene = scene;

  if (texts.length > 0) {
    texts.forEach((mesh) => {
      mesh.lookAt(camera.position);
    });
  }

  if (currentScene === mainScene) {
    if (
      !loading &&
      scene.getObjectByName("rightBuildings") &&
      scene.getObjectByName("leftBuildings") &&
      // scene.getObjectByName("shop") &&
      scene.getObjectByName("floor")
    ) {
      appearingItemsAfterLoad();
      if (character) {
        onDoorway(character);
      }
    }
    if (character) {
      updateCamera(character, camera, CAMERA_OFFSET);
    }
    let finalDirection = keyboardMovement();

    clickToMove();
    keyboardMovingSlide(finalDirection);
  }
  return { character, camera, currentScene };
}

export function initGame(sharedState) {
  // Buildings
  currentScene = scene;
  createBuildings(scene);
  createDetails(scene);
  createDoorways();
  // Game floor
  loader.load(
    "models/floor.glb",
    function (gltf) {
      console.log("hello?");
      floor = gltf.scene;
      floor.position.set(0, 0, 0);
      floor.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = false;
          node.receiveShadow = true;
        }
      });
      floor.scale.set(0.3, 0.3, 0.3);
      floor.name = "floor";
      scene.add(floor);
    },
    function (xhr) {
      //While it is loading, log the progress
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded floor");
    },
    function (error) {
      console.log("bye");
      console.error(error);
    }
  );

  const fontPath = "fonts/PixelifySans_Regular.json";
  createText(scene, "projects", new THREE.Vector3(38, 90, -90), fontPath, 10);
  createText(scene, "about me", new THREE.Vector3(38, 70, -164), fontPath, 10);
  createText(scene, "experiences", new THREE.Vector3(92, 75, -210), fontPath, 8);
  createText(scene, "skills", new THREE.Vector3(170, 75, -210), fontPath, 10);
  // createText(scene, "shop", new THREE.Vector3(186, 50, -130), fontPath, 10);

  targetPosition = new THREE.Vector3(0, 20, 0);
  // Add mouse and keyboard controls
  document.addEventListener("keydown", (event) => onKeyDown(event, scene));
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);

  const charMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
  const charGeometry = new THREE.BoxGeometry(20, 40, 80);
  character = new THREE.Mesh(charGeometry, charMaterial);
  
  loader.load(
    "models/cloudme.glb",
    function (gltf) {
      character = gltf.scene;
      character.position.set(...startPosition);
      character.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      character.scale.set(0.08, 0.08, 0.08);
      character.rotation.y = -Math.PI / 4;
      scene.add(character);
      sharedState.mixer = new THREE.AnimationMixer(character);

      // Play the first animation clip by default
      const clips = gltf.animations; // Array of animation clips

      if (clips.length > 0) {
        const action = sharedState.mixer.clipAction(clips[0]); // Play the first clip

        action.setLoop(THREE.LoopRepeat);
        action.play();
      }

      camera.position.copy(character.position.clone().add(CAMERA_OFFSET));
      camera.lookAt(character.position);

      return character;
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded character");
    },
    function (error) {
      console.log("bye");
      console.error(error);
    }
  );

  const canvas = document.querySelector("#gameCanvas");
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mouseup", onMouseUp);
}

function createDetails(scene) {
  loader.load(
    "models/cherryTree1.glb",
    function (gltf) {
      let tree1 = gltf.scene;
      tree1.position.set(33, -8, -219);
      tree1.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      tree1.scale.set(9, 5, 9);

      tree1.name = "tree1";

      scene.add(tree1);
    },
    function (xhr) {
      // //While it is loading, log the progress
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded tree1");
    },
    function (error) {
      console.log("bye");
      console.error(error);
    }
  );
}

// Create buildings and doors
function createBuildings(scene) {
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    "models/leftBuildingsNew1.glb",
    function (gltf) {
      leftBuildings = gltf.scene;
      leftBuildings.position.set(0, 0, 0);
      leftBuildings.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      leftBuildings.scale.set(0.3, 0.3, 0.3);
      leftBuildings.name = "leftBuildings";
      scene.add(leftBuildings);
    },
    function (xhr) {
      //While it is loading, log the progress
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded leftBuildings");
    },
    function (error) {
      console.log("bye");
      console.error(error);
    }
  );
  loader.load(
    "models/rightBuildingsNew1.glb",
    function (gltf) {
      rightBuildings = gltf.scene;
      rightBuildings.position.set(0, 0, 0);
      rightBuildings.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      rightBuildings.scale.set(0.3, 0.3, 0.3);
      rightBuildings.name = "rightBuildings";
      scene.add(rightBuildings);
    },
    function (xhr) {
      //While it is loading, log the progress
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded rightBuildings");
    },
    function (error) {
      console.log("bye");
      console.error(error);
    }
  );
  // loader.load(
  //   "models/teaShopNew1.glb",
  //   function (gltf) {
  //     shop = gltf.scene;
  //     shop.position.set(0, 0, 0);
  //     shop.traverse((node) => {
  //       if (node.isMesh) {
  //         node.castShadow = true;
  //         node.receiveShadow = true;
  //       }
  //     });
  //     shop.scale.set(0.3, 0.3, 0.3);
  //     shop.name = "shop";
  //     scene.add(shop);
  //   },
  //   function (xhr) {
  //     //While it is loading, log the progress
  //     console.log((xhr.loaded / xhr.total) * 100 + "% loaded shop");
  //   },
  //   function (error) {
  //     console.log("bye");
  //     console.error(error);
  //   }
  // );
  
}


function createText(scene, text, position, fontPath, fontSize) {
  const fontLoader = new FontLoader();
  fontLoader.load(fontPath, (font) => {
    const textGeometry = new TextGeometry(text, {
      font: font,
      size: fontSize,
      depth: 5,
    });
    textGeometry.computeBoundingBox();
    const boundingBox = textGeometry.boundingBox;
    const offsetX = (boundingBox.max.x - boundingBox.min.x) / 2;
    const offsetY = (boundingBox.max.y - boundingBox.min.y) / 2;
    const offsetZ = (boundingBox.max.z - boundingBox.min.z) / 2;

    textGeometry.translate(-offsetX, -offsetY, -offsetZ);
    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xe67ae2 });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);

    textMesh.position.set(position.x, position.y, position.z);

    texts.push(textMesh);
    scene.add(textMesh);
  });
}

//////////////////////////////////////////////////////////////////
//////////// Changing Scenes ////////////////////////////////////
//////////////////////////////////////////////////////////////////

function createDoorways() {
  const projectsDoorMin = new THREE.Vector3(105, -50, 132);
  const projectsDoorMax = new THREE.Vector3(188, 50, 408);
  const aboutMeMin = new THREE.Vector3(105, -50, -46);
  const aboutMeMax = new THREE.Vector3(188, 50, 86);
  const experienceMin = new THREE.Vector3(117, -50, -60);
  const experienceMax = new THREE.Vector3(292, 50, 20);
  const skillsMin = new THREE.Vector3(365, -50, -60);
  const skillsMax = new THREE.Vector3(504, 50, 20);
  // const shopMin = new THREE.Vector3(365, -50, -60);
  // const shopMax = new THREE.Vector3(504, 50, 20);

  doorways.projects = new THREE.Box3(projectsDoorMin, projectsDoorMax);
  doorways.aboutMe = new THREE.Box3(aboutMeMin, aboutMeMax);
  doorways.experience = new THREE.Box3(experienceMin, experienceMax);
  doorways.skills = new THREE.Box3(skillsMin, skillsMax);
  // doorways.shop = new THREE.Box3(shopMin, shopMax);

  // Object.entries(doorways).forEach(([showcase, box]) => {
  //   scene.add(new THREE.Box3Helper(box, 0xff0000));
  // });
}

export function resetPopupText() {
  const popup = document.getElementById("entrance_popup_container");
  popup.style.display = "none";
  const buttons = document.querySelectorAll(".enter_button");

  // Loop through each button and set its display style to 'none'
  buttons.forEach((button) => {
    button.style.display = "none";
  });
  document.getElementById("twoOptions").style.display = "none";
  document.getElementById("oneOption").style.display = "none";
}

function turnOptionsOn(showcases, length) {
  const buttons = document.querySelectorAll(".enter_button");
  buttons.forEach((button) => {
    button.style.display = "none";
  });

  // Showing popup
  const popup = document.getElementById("entrance_popup_container");
  popup.style.display = "flex";

  // Showing text
  if (length > 1) {
    document.getElementById("oneOption").style.display = "none";
    document.getElementById("twoOptions").style.display = "block";
  } else {
    document.getElementById("oneOption").style.display = "block";
    document.getElementById("twoOptions").style.display = "none";
  }

  showcases.forEach((showcase) => {
    switch (showcase) {
      case "projects":
        document.getElementById("projects_button").style.display = "flex";
        break;
      case "aboutMe":
        document.getElementById("aboutme_button").style.display = "flex";
        break;
      case "experience":
        document.getElementById("experience_button").style.display = "flex";
        break;
      case "skills":
        document.getElementById("skills_button").style.display = "flex";
        break;
      // case "shop":
      //   document.getElementById("shop_button").style.display = "flex";
      //   break;
    }
  });
}

function onDoorway(character) {
  let standingOn = [];
  let characterPosition = character.position;
  if (doorways !== undefined) {
    Object.entries(doorways).forEach(([showcase, box]) => {
      if (box.containsPoint(characterPosition)) {
        standingOn.push(showcase);
      }
    });
  }
  let length = standingOn.length;
  if (length > 0) {
    turnOptionsOn(standingOn, length);
  } else {
    resetPopupText();
  }
}

function moveScene() {
  clickMoving = false;
  keys = {};
  scene.remove(darkSpot);
  mainScene = scene;
  resetPopupText();
}

document
  .getElementById("projects_button")
  .addEventListener("click", function () {
    moveScene();
    currentScene = initProjectsGame();
  });

document
  .getElementById("aboutme_button")
  .addEventListener("click", function () {
    // Code to run when the "Enter About Me" button is clicked
    moveScene();
    currentScene = initProjectsGame();
  });

document
  .getElementById("experience_button")
  .addEventListener("click", function () {
    moveScene();
    currentScene = initProjectsGame();
  });

document.getElementById("skills_button").addEventListener("click", function () {
  moveScene();
  currentScene = initProjectsGame();
});

// document.getElementById("shop_button").addEventListener("click", function () {
//   // Code to run when the "Enter Shop" button is clicked
//   moveScene();
//   currentScene = initProjectsGame();
// });

//////////////////////////////////////////////////////////////////
//////////////// Mouse Activities //////////////////////////////////
//////////////////////////////////////////////////////////////////

let mouseDownTime = 0; // Time when mouse is pressed down
const CLICK_THRESHOLD = 150; // Time in milliseconds to consider it a short click (e.g., 300ms)

function onMouseDown() {
  mouseDownTime = Date.now(); // Record the time when the mouse is pressed
}

function onMouseUp(event) {
  const clickDuration = Date.now() - mouseDownTime; // Calculate how long the button was held down

  if (clickDuration < CLICK_THRESHOLD) {
    // If the click was short, set moving to true
    onMouseClick(event); // Call your click handler function to move the character
  }
}

function onMouseClick(event) {
  scene.remove(darkSpot);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera); //scene.userData.camera

  const intersects = raycaster.intersectObject(floor);
  if (intersects.length > 0 && intersects[0].point.y > -25) {
    console.log("Mouse clicked on ", intersects[0].point);
    targetPosition.copy(intersects[0].point);
    targetPosition.y = 20; // Match character height
    clickMoving = true;

    createDarkSpot(intersects[0].point);
  }
}

function createDarkSpot(position) {
  const darkSpotGeometry = new THREE.CircleGeometry(5, 6); // Radius and segments
  const darkSpotMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    opacity: 0.5,
    transparent: true,
  });
  darkSpot = new THREE.Mesh(darkSpotGeometry, darkSpotMaterial);
  darkSpot.rotation.x = -Math.PI / 2; // Align with the floor
  darkSpot.position.copy(position);
  darkSpot.position.y += 1.5; // Slightly above the floor to avoid z-fighting
  scene.add(darkSpot);
}

// Listen for mouse clicks and move the character

function onWindowBlur() {
  keys = {}; // Clear all keys
}

function onKeyDown(event, scene) {
  keys[event.key.toLowerCase()] = true; // Track key press
}

function onKeyUp(event) {
  keys[event.key.toLowerCase()] = false; // Track key release
}

function appearingItemsAfterLoad() {
  const loadingScreen = document.getElementById("loading_screen");
  loadingScreen.style.display = "none";

  // Popup
  const popup = document.getElementById("popup");
  const okButton = document.getElementById("okButton");
  if (localStorage.getItem("visited") !== "true") {
    popup.style.display = "flex"; // Make the popup visible
    document.body.style.cursor = "grab"; // Make the cursor visible during the popup
  }
  okButton.addEventListener("click", () => {
    popup.style.display = "none";
    localStorage.setItem("visited", true);
  });

  const gameButtons = document.getElementById("gameButtons");
  gameButtons.style.display = "flex";
}

///////////////////////////////////////////////
//////////////// MOVEMENT /////////////////////
///////////////////////////////////////////////

function keyboardMovement() {
  let direction = new THREE.Vector3();
  let finalDirection = new THREE.Vector3();
  if (localStorage.getItem("visited") === "true") {
    if (keys["w"] || keys["arrowup"]) {
      scene.remove(darkSpot);
      clickMoving = false;
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction = direction.normalize();
      finalDirection.add(direction);
    }
    if (keys["s"] || keys["arrowdown"]) {
      scene.remove(darkSpot);
      clickMoving = false;
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction = direction.normalize().negate();
      finalDirection.add(direction);
    }
    if (keys["a"] || keys["arrowleft"]) {
      scene.remove(darkSpot);
      clickMoving = false;
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
      finalDirection.add(direction);
    }
    if (keys["d"] || keys["arrowright"]) {
      scene.remove(darkSpot);
      clickMoving = false;
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      finalDirection.add(direction);
    }
  }
  return finalDirection;
}

function clickToMove() {
  if (clickMoving && character !== undefined) {
    const movingDirection = targetPosition.clone().sub(character.position);
    movingDirection.y = 0;
    // If the distance to target is large enough, move the character
    if (movingDirection.length() > SPEED) {
      const stepDirection = movingDirection.normalize().multiplyScalar(SPEED); // Step size

      // Check if the next step leads to a collision
      const newPosition = character.position.clone().add(stepDirection);
      const result = isCollision(newPosition); // Check for collision at new position
      if (!result) {
        // No collision, move the character
        character.position.add(stepDirection);
        updateRotation(stepDirection);
      } else {
        scene.remove(darkSpot);
        clickMoving = false;
      }
    } else {
      scene.remove(darkSpot);
      clickMoving = false; // Stop moving when the target is reached
    }
  }
}

function keyboardMovingSlide(finalDirection) {
  if (character !== undefined) {
    let newPosition = character.position.clone().add(finalDirection);
    const result = isCollision(newPosition);
    let collisionNormal = null;
    let wall = null;

    if (result) {
      collisionNormal = result.collisionNormal;
      wall = result.collidingWall;
    }

    updateRotation(finalDirection);
    if (!collisionNormal) {
      // No collision: move the character in the intended direction

      character.position.addScaledVector(finalDirection, SPEED);
    } else {
      // Slide along the wall using the collision normal
      const slideDirection = finalDirection
        .clone()
        .projectOnPlane(collisionNormal);

      if (slideDirection.length() > 0) {
        slideDirection.normalize();
        let slidingPosition = character.position
          .clone()
          .addScaledVector(slideDirection, SPEED);

        // Check if the new sliding position causes a collision, excluding the current sliding wall
        const collisionNormalAfterSlide = isCollision(slidingPosition, wall);

        if (!collisionNormalAfterSlide) {
          // If no collision, perform the slide movement
          character.position.addScaledVector(slideDirection, SPEED);
        }
      }
    }
  }
}

let lastDirection = new THREE.Vector3(0, 0, 1); // Default direction
function updateRotation(inputVector) {
  if (inputVector.length() > 0) {
    // Normalize the input vector and store the last valid direction
    inputVector.normalize();
    lastDirection.copy(inputVector);

    // Calculate the target angle based on the input vector
    const targetAngle = Math.atan2(inputVector.x, inputVector.z) - Math.PI / 2; // Angle in radians
    // const targetAngle = Math.atan2(inputVector.x, inputVector.z);

    // Smoothly interpolate the character's current rotation to the target angle
    const currentAngle = character.rotation.y; // Current Y-axis rotation
    const newAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, 1);

    // Apply the new angle
    character.rotation.y = newAngle;
  }
}

////////////////////////////////////////////////
////////////// Camera Movement//////////////////
////////////////////////////////////////////////

let currentRotation = new THREE.Vector2(0, 0);
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
document.addEventListener("mousedown", (event) => {
  isDragging = true;
  previousMousePosition = { x: event.clientX, y: event.clientY };
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mouseleave", () => {
  if (isDragging) {
    isDragging = false;
  }
});

document.addEventListener("mousemove", (event) => {
  const deltaX = event.clientX - previousMousePosition.x;
  const deltaY = event.clientY - previousMousePosition.y;
  if (isDragging) {
    // Update the current rotation based on mouse movement
    currentRotation.x -= deltaY * CAMERA_ROTATION_SPEED; // Pitch (up/down)
    currentRotation.y -= deltaX * CAMERA_ROTATION_SPEED; // Yaw (left/right)

    // Limit vertical rotation to avoid flipping
    currentRotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, currentRotation.x)
    );

    // Update the previous mouse position for the next frame
    previousMousePosition = { x: event.clientX, y: event.clientY };
  } else {
    // Update the current rotation based on mouse movement
    currentRotation.x -= deltaY * 0.00005; // Pitch (up/down)
    currentRotation.y -= deltaX * 0.00005; // Yaw (left/right)

    // Limit vertical rotation to avoid flipping

    // Update the previous mouse position for the next frame
    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});

function updateCamera(playerCharacter, camera, CAMERA_OFFSET) {
  // Apply the rotation to the camera's position
  const rotationQuat = new THREE.Quaternion();
  rotationQuat.setFromEuler(
    new THREE.Euler(currentRotation.x, currentRotation.y, 0, "YXZ")
  ); // Apply rotation

  // Calculate the new camera offset based on the rotation
  const cameraOffset = new THREE.Vector3(
    CAMERA_OFFSET.x,
    CAMERA_OFFSET.y,
    CAMERA_OFFSET.z
  );
  cameraOffset.applyQuaternion(rotationQuat); // Apply the rotation to the offset
  if (cameraOffset.y < 10) {
    cameraOffset.y = 10;
  }
  // Smoothly move the camera towards the target position based on the rotated offset
  const targetPosition = playerCharacter.position.clone().add(cameraOffset);
  camera.position.lerp(targetPosition, 0.1); // Smoothly follow player

  // Ensure the camera always looks at the player character
  camera.lookAt(playerCharacter.position);
}

////////////////////////////////////////////////
////////////// Collision //////////////////
////////////////////////////////////////////////

const invisWalls = [];
function isCollision(newPosition, ignoreWall = null) {
  // Define character as a sphere for collision purposes
  const characterRadius = 5; // Approximate radius of the character
  const characterHitbox = new THREE.Sphere(newPosition, characterRadius);

  let collisionNormal = null;
  let collidingWall = null;

  const box1Min = new THREE.Vector3(0, -21, -190); // right wall
  const box1Max = new THREE.Vector3(560, 31, -190);
  const box2Min = new THREE.Vector3(70, -21, -300); // left wall as
  const box2Max = new THREE.Vector3(70, 31, 104);

  const rightWall = new THREE.Box3(box1Min, box1Max);
  const leftWall = new THREE.Box3(box2Min, box2Max);

  invisWalls.push(leftWall);
  invisWalls.push(rightWall);

  invisWalls.forEach((wall) => {
    // Skip the wall that is passed as ignoreWall
    if (wall === ignoreWall) return;

    if (wall.intersectsSphere(characterHitbox)) {
      // Calculate the closest point on the current wall's bounding box to the character
      const closestPoint = new THREE.Vector3(
        Math.max(wall.min.x, Math.min(newPosition.x, wall.max.x)),
        Math.max(wall.min.y, Math.min(newPosition.y, wall.max.y)),
        Math.max(wall.min.z, Math.min(newPosition.z, wall.max.z))
      );
      // Calculate collision normal
      collisionNormal = new THREE.Vector3()
        .subVectors(newPosition, closestPoint)
        .normalize();

      collisionNormal.y = 0; // Flatten the normal to the XZ plane
      collidingWall = wall;
    }
  });

  if (collisionNormal) {
    return { collisionNormal, collidingWall };
  }

  return null;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const resetButton = document.getElementById("resetButton");

resetButton.addEventListener("click", (e) => {
  currentScene = mainScene;
  character.position.set(...startPosition);
  scene.remove(darkSpot);
  clickMoving = false;
  keys = {};
  character.rotation.y = -Math.PI / 4;
});

document.getElementById("back_button").addEventListener("click", () => {
  currentScene = mainScene;
});
