
import { useRef } from "react";
import { showcases } from "./Static";
import { useFrame } from "@react-three/fiber";

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
  const prevKey = useRef("");

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
    setProjectButton(false);
    setAboutButton(false);
    setExperiencesButton(false);
    setSkillsButton(false);
    setEnterPopupVisible(true);
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
    if (!characterRef.current) return;

    let standingOn = [];
    let characterPosition = characterRef.current.position;

    Object.entries(showcases).forEach(([, showcase]) => {
      let box = showcase.box;
      if (box.containsPoint(characterPosition)) {
        standingOn.push(showcase.showcaseName);
      }
    });

    const key = standingOn.sort().join(",");
    if (key === prevKey.current) return;
    prevKey.current = key;

    if (standingOn.length > 0) {
      turnOptionsOn(standingOn, standingOn.length);
    } else {
      resetPopupText();
    }
  });

  return null;
}
