import React, { useRef, useEffect, useState } from "react";
import MainGame from "./Game/MainGame.jsx";
import LoadingScreen from "./UserInterface/LoadingScreen.jsx";
import Menu from "./UserInterface/Menu.jsx";
import EnterPopup from "./UserInterface/EnterPopup.jsx";
import "./App.css";
import BackButton from "./UserInterface/BackButton.jsx";
import Projects from "./Pages/Projects.jsx";
import ResetButton from "./UserInterface/ResetButton.jsx";
import Popup from "./UserInterface/TutorialPopup.jsx";
import HelpButton from "./UserInterface/HelpButton.jsx";
import AboutMe from "./Pages/AboutMe.jsx";
import Skills from "./Pages/Skills.jsx";
import Experiences from "./Pages/Experiences.jsx";

const MainPage = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [enterPopupVisible, setEnterPopupVisible] = useState(false);
  const [twoOptionsButton, setTwoOptionsButton] = useState(false);
  const [oneOptionButton, setOneOptionButton] = useState(false);
  const [projectButton, setProjectButton] = useState(false);
  const [aboutButton, setAboutButton] = useState(false);
  const [experiencesButton, setExperiencesButton] = useState(false);
  const [skillsButton, setSkillsButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reseted, setReseted] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentScene === 0) {
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "default";
    }
  }, [currentScene]);

  return (
    <>
      <Menu />
      {loading && currentScene === 0 && <LoadingScreen progress={progress} />}
      {!loading && (
        <>
          <ResetButton
            setReseted={setReseted}
            setCurrentScene={setCurrentScene}
          ></ResetButton>
          <HelpButton></HelpButton>
          {localStorage.getItem("visited") !== "true" && showPopup && (
            <Popup setShowPopup={setShowPopup}></Popup>
          )}
        </>
      )}

      <div
        style={{
          height: "100%",
          width: "100%",
          display: currentScene === 0 ? "block" : "none",
        }}
      >
        <MainGame
          setLoading={setLoading}
          setEnterPopupVisible={setEnterPopupVisible}
          setProjectButton={setProjectButton}
          setAboutButton={setAboutButton}
          setExperiencesButton={setExperiencesButton}
          setSkillsButton={setSkillsButton}
          setTwoOptionsButton={setTwoOptionsButton}
          setOneOptionButton={setOneOptionButton}
          reseted={reseted}
          setReseted={setReseted}
          setProgress={setProgress}
        />
      </div>
      {enterPopupVisible && currentScene === 0 && (
        <EnterPopup
          twoOptionsButton={twoOptionsButton}
          oneOptionButton={oneOptionButton}
          projectButton={projectButton}
          aboutButton={aboutButton}
          experiencesButton={experiencesButton}
          skillsButton={skillsButton}
          setCurrentScene={setCurrentScene}
        />
      )}
      {currentScene !== 0 && (
        <BackButton setCurrentScene={setCurrentScene}></BackButton>
      )}
      {currentScene === 1 && (
        <AboutMe setCurrentScene={setCurrentScene}></AboutMe>
      )}
      {currentScene === 2 && <Projects ></Projects>}
      {currentScene === 3 && <Experiences setCurrentScene={setCurrentScene}></Experiences>}
      {currentScene === 4 && <Skills></Skills>}
    </>
  );
};

export default MainPage;
