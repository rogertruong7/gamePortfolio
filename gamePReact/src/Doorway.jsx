import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

function Doorway({
  characterRef,
  boxMin,
  boxMax,
  showcaseName,
  setEnterPopupVisible,
  setProjectButton,
  setAboutButton,
  setExperiencesButton,
  setSkillsButton,
  setTwoOptionsButton,
  setOneOptionButton,
  setStandingOn,
  standingOn
}) {
  
  const box = new THREE.Box3(boxMin, boxMax);
  
  function resetPopupText() {
    setEnterPopUpVisible(false);
    setProjectButton(false);
    setAboutButton(false);
    setExperiencesButton(false);
    setSkillsButton(false);
    setTwoOptionsButton(false);
    setOneOptionButton(false);
  }
  
  

  function turnOptionsOn(showcases, length) {
    setProjectButton(false);
    setAboutButton(false);
    setExperiencesButton(false);
    setSkillsButton(false);


    // Showing popup
    setEnterPopUpVisible(true)
    // Showing text
    if (length > 1) {
      setTwoOptionsButton(true);
    setOneOptionButton(false);
    } else {
      setTwoOptionsButton(false);
    setOneOptionButton(true);
    }
    
    
    switch (showcase) {
      case "projects":
        setProjectButton(true);
        break;
      case "aboutMe":
        setAboutButton(true);
        break;
      case "experience":
        setExperiencesButton(true);
        break;
      case "skills":
        setSkillsButton(true);
        break;
      
    }
  }
  
  useFrame(() => {
    
    let characterPosition = characterRef.position;
    let newArray = [...standingOn];
    if (box !== undefined) {
      
        if (box.containsPoint(characterPosition)) {
          
          newArray.push(showcaseName);
          setStandingOn(newArray);
        }
    }
    let length = newArray.length;
    if (length > 0) {
      turnOptionsOn(newArray, length);
    } else {
      resetPopupText();
    }
  
  });

}

  return (
    <>
      <Box3
      >
      
      <Box3/>
    </>
  );
}



// For below create a moveScene Button jsx
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