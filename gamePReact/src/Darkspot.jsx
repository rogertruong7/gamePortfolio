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