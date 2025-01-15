import React, { useRef, useEffect, useState } from "react";
import MainGame from "./Game/MainGame.jsx";
import LoadingScreen from "./UserInterface/LoadingScreen.jsx";
import Menu from "./UserInterface/Menu.jsx";
import EnterPopup from "./UserInterface/EnterPopup.jsx";
import "./App.css";
import BackButton from "./UserInterface/BackButton.jsx";
import Projects from "./Projects/Projects.jsx";

document.body.style.cursor = "grab";

const App = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [enterPopUpVisible, setEnterPopUpVisible] = useState(true);
  const [twoOptionsButton, setTwoOptionsButton] = useState(false);
  const [oneOptionButton, setOneOptionButton] = useState(false);
  const [projectButton, setProjectButton] = useState(false);
  const [aboutButton, setAboutButton] = useState(true);
  const [experiencesButton, setExperiencesButton] = useState(false);
  const [skillsButton, setSkillsButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backButtonVisible, setBackButtonVisible] = useState(false);

  return (
    <>
      <Menu />
      {loading && currentScene === 0 && <LoadingScreen />}
      <div
        style={{
          height: "100%",
          width: "100%",
          display: currentScene === 0 ? "block" : "none",
        }}
      >
        <MainGame
          style={{ display: "none" }}
          setLoading={setLoading}
          setCurrentScene={setCurrentScene}
          setEnterPopUpVisible={setEnterPopUpVisible}
          setProjectButton={setProjectButton}
          setAboutButton={setAboutButton}
          setExperiencesButton={setExperiencesButton}
          setSkillsButton={setSkillsButton}
          setTwoOptionsButton={setTwoOptionsButton}
          setOneOptionButton={setOneOptionButton}
        />
      </div>
      {enterPopUpVisible && (
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
        <Projects></Projects>
      )}
      {currentScene === 2 && <h1>PROJECTSSSSSSSSSSSS</h1>}
      {currentScene === 3 && <h1>EXPERIENCESSSSSSSSS</h1>}
      {currentScene === 4 && <h1>SKILLSSSSSSSSSSSSSS</h1>}
    </>
  );
};

export default App;
