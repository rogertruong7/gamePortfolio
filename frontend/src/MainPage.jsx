import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
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
import HelpPopup from "./UserInterface/HelpPopup.jsx";
import { AudioProvider, useAudio } from "./Audio/AudioContext.jsx";
import { AudioManager } from "./Audio/AudioManager.jsx";
import { track } from "./Analytics/tracker.js";
import { readStore } from "./Helpers/storage.js";

const SCENE_NAMES = {
  1: "About Me",
  2: "Projects",
  3: "Experiences",
  4: "Skills",
};

const doorSound = new Howl({ src: ["/audio/door-open.mp3"], volume: 0.35 });

const AutoAudioReady = ({ loading }) => {
  const { audioReady, setAudioReady } = useAudio();

  useEffect(() => {
    if (!loading && !audioReady && readStore("visited") === "true") {
      const unlock = () => {
        setAudioReady(true);
        window.removeEventListener("click", unlock);
        window.removeEventListener("keydown", unlock);
      };
      window.addEventListener("click", unlock);
      window.addEventListener("keydown", unlock);
      return () => {
        window.removeEventListener("click", unlock);
        window.removeEventListener("keydown", unlock);
      };
    }
  }, [loading, audioReady, setAudioReady]);

  return null;
};

const MainPage = () => {
  const [currentScene, setCurrentScene] = useState(0);
  // The scene the character is walking through a door to reach
  const [enteringScene, setEnteringScene] = useState(null);
  const [enterPopupVisible, setEnterPopupVisible] = useState(false);
  const [twoOptionsButton, setTwoOptionsButton] = useState(false);
  const [projectButton, setProjectButton] = useState(false);
  const [aboutButton, setAboutButton] = useState(false);
  const [experiencesButton, setExperiencesButton] = useState(false);
  const [skillsButton, setSkillsButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reseted, setReseted] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isWading, setIsWading] = useState(false);
  const [isPlunging, setIsPlunging] = useState(false);
  const hasMovedRef = useRef(false);

  const finishEntering = (scene) => {
    doorSound.play();
    setCurrentScene(scene);
    setEnteringScene(null);
  };

  useEffect(() => {
    if (SCENE_NAMES[currentScene]) track("scene_enter", SCENE_NAMES[currentScene]);
  }, [currentScene]);

  useEffect(() => {
    if (!loading) track("game_loaded");
  }, [loading]);

  useEffect(() => {
    if (isMoving && !hasMovedRef.current) {
      hasMovedRef.current = true;
      track("first_move");
    }
  }, [isMoving]);

  useEffect(() => {
    if (currentScene === 0) {
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "default";
    }
  }, [currentScene]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && currentScene !== 0) {
        setCurrentScene(0);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [currentScene]);

  return (
    <AudioProvider>
      <AutoAudioReady loading={loading} />
      <AudioManager
        currentScene={currentScene}
        isMoving={isMoving}
        isWading={isWading}
        isPlunging={isPlunging}
      />
      <Menu />
      {loading && currentScene === 0 && <LoadingScreen progress={progress} />}
      {!loading && (
        <>
          <ResetButton
            setReseted={setReseted}
            setCurrentScene={setCurrentScene}
          ></ResetButton>
          <HelpButton setShowHelp={setShowHelp}></HelpButton>
          {readStore("visited") !== "true" && showPopup && (
            <Popup setShowPopup={setShowPopup}></Popup>
          )}
          {showHelp && <HelpPopup setShowHelp={setShowHelp}></HelpPopup>}
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
          reseted={reseted}
          setReseted={setReseted}
          setProgress={setProgress}
          setIsMoving={setIsMoving}
          setIsWading={setIsWading}
          setIsPlunging={setIsPlunging}
          currentScene={currentScene}
          enteringScene={enteringScene}
          setEnteringScene={setEnteringScene}
          onEntered={finishEntering}
        />
      </div>
      {enterPopupVisible && currentScene === 0 && enteringScene === null && (
        <EnterPopup
          twoOptionsButton={twoOptionsButton}
          projectButton={projectButton}
          aboutButton={aboutButton}
          experiencesButton={experiencesButton}
          skillsButton={skillsButton}
          enterScene={setEnteringScene}
        />
      )}
      {currentScene !== 0 && (
        <BackButton setCurrentScene={setCurrentScene}></BackButton>
      )}
      {currentScene === 1 && (
        <AboutMe setCurrentScene={setCurrentScene}></AboutMe>
      )}
      {currentScene === 2 && <Projects></Projects>}
      {currentScene === 3 && (
        <Experiences setCurrentScene={setCurrentScene}></Experiences>
      )}
      {currentScene === 4 && <Skills setCurrentScene={setCurrentScene}></Skills>}
    </AudioProvider>
  );
};

export default MainPage;
