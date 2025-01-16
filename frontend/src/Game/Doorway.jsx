import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";
import { showcases } from "./Static";

export default function Doorway({
  characterRef,
  setEnterPopupVisible,
  setProjectButton,
  setAboutButton,
  setExperiencesButton,
  setSkillsButton,
  setTwoOptionsButton,
  setOneOptionButton,
}) {
  // const box = new THREE.Box3(boxMin, boxMax);

  function resetPopupText() {
    setEnterPopupVisible(false);
    setProjectButton(false);
    setAboutButton(false);
    setExperiencesButton(false);
    setSkillsButton(false);
    setTwoOptionsButton(false);
    setOneOptionButton(false);
  }

  function turnOptionsOn(showcases, length) {
    // Showing popup
    setProjectButton(false);
    setAboutButton(false);
    setExperiencesButton(false);
    setSkillsButton(false);
    setEnterPopupVisible(true);
    // Showing text
    if (length > 1) {
      setTwoOptionsButton(true);
      setOneOptionButton(false);
    } else {
      setTwoOptionsButton(false);
      setOneOptionButton(true);
    }
    showcases.forEach((showcase) => {
      switch (showcase) {
        case "projects":
          setProjectButton(true);
          break;
        case "aboutMe":
          setAboutButton(true);
          break;
        case "experiences":
          setExperiencesButton(true);
          break;
        case "skills":
          setSkillsButton(true);
          break;
      }
    });
  }

  useFrame(() => {
    let standingOn = [];
    if (characterRef.current) {
      let characterPosition = characterRef.current.position;

      Object.entries(showcases).forEach(([index, showcase]) => {
        let box = showcase.box;
        if (box.containsPoint(characterPosition)) {
          standingOn.push(showcase.showcaseName);
        }
      });

      let length = standingOn.length;
      if (length > 0) {
        turnOptionsOn(standingOn, length);
      } else {
        resetPopupText();
      }
    }
  });

  // const result = useThree();

  // useEffect(() => {
  //   const helpers = []; // Array to store helpers

  //   showcases.forEach((showcase) => {
  //     const helper = new THREE.Box3Helper(showcase.box, 0xff0000); // Red color for the helper
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
}
