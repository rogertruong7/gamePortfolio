import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import PlayerCount from "./UserInterface/PlayerCount.jsx";
import Chat from "./UserInterface/Chat.jsx";
import Wardrobe from "./UserInterface/Wardrobe.jsx";
import WardrobeButton from "./UserInterface/WardrobeButton.jsx";
import { AudioProvider, useAudio } from "./Audio/AudioContext.jsx";
import { AudioManager } from "./Audio/AudioManager.jsx";
import { track } from "./Analytics/tracker.js";
import { readStore } from "./Helpers/storage.js";
import { prefetchSansFight } from "./Helpers/prefetchSansFight.js";
import { loadLook, sanitizeLook, saveLook } from "./Game/look/lookOptions.js";
import { useRoom } from "./Multiplayer/useRoom.js";
import { useBenchGame } from "./BenchGames/useBenchGame.js";
import Arcade from "./Arcade/Arcade.jsx";
import { ROOM_PARAM, newRoomCode, readRoomCode, rememberRoom } from "./Multiplayer/roomCode.js";
import { cleanName, loadChatName, saveChatName } from "./Multiplayer/chat.js";

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
  const [isFighting, setIsFighting] = useState(false);
  const [look, setLook] = useState(loadLook);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showArcade, setShowArcade] = useState(false);
  // The name picked for chatting, or "" to go by a made-up one
  const [chatName, setChatName] = useState(loadChatName);
  const hasMovedRef = useRef(false);
  // The room's code from the address, or null for the main town
  const [searchParams, setSearchParams] = useSearchParams();
  const roomCode = readRoomCode(searchParams.get(ROOM_PARAM));
  // Moves to another room by changing the address, so the link can be shared and Back returns
  const goToRoom = useCallback(
    (code) => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        if (code) next.set(ROOM_PARAM, code);
        else next.delete(ROOM_PARAM);
        return next;
      });
    },
    [setSearchParams]
  );
  const createRoom = useCallback(() => goToRoom(newRoomCode()), [goToRoom]);
  const leaveRoom = useCallback(() => goToRoom(null), [goToRoom]);
  useEffect(() => rememberRoom(roomCode), [roomCode]);
  // The town is joined once the game has loaded
  const room = useRoom(look, chatName, !loading, roomCode);
  // Games with anyone else in the town, started from a bench or the list of who's here
  const games = useBenchGame(
    room.roomRef,
    room.peers,
    room.status === "online",
    // Someone playing a game on their own turns down invites until they're done
    !loading && currentScene === 0 && !showArcade
  );
  const inTown = !loading && currentScene === 0;
  const openArcade = useCallback(() => setShowArcade(true), []);

  const renameChat = (next) => {
    const clean = cleanName(next);
    saveChatName(clean);
    setChatName(clean);
  };

  const saveWardrobe = (next) => {
    const clean = sanitizeLook(next);
    saveLook(clean);
    setLook(clean);
    setShowWardrobe(false);
  };

  const finishEntering = (scene) => {
    doorSound.play();
    setCurrentScene(scene);
    setEnteringScene(null);
  };

  useEffect(() => {
    if (SCENE_NAMES[currentScene]) track("scene_enter", SCENE_NAMES[currentScene]);
  }, [currentScene]);

  useEffect(() => {
    if (loading) return;
    track("game_loaded");
    prefetchSansFight();
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
        isFighting={isFighting}
      />
      <Menu
        room={room}
        onPlay={games.openMenu}
        onArcade={inTown ? openArcade : null}
        onCreateRoom={createRoom}
        onLeaveRoom={leaveRoom}
      />
      {loading && currentScene === 0 && <LoadingScreen progress={progress} />}
      {!loading && (
        <>
          <ResetButton
            setReseted={setReseted}
            setCurrentScene={setCurrentScene}
            afterHome={currentScene !== 0}
          ></ResetButton>
          <HelpButton setShowHelp={setShowHelp} aboveEmotes={currentScene === 0}></HelpButton>
          {currentScene === 0 && (
            <>
              <PlayerCount room={room} onPlay={games.openMenu} onLeaveRoom={leaveRoom} />
              <Chat room={room} onRename={renameChat} onCreateRoom={createRoom} />
              <WardrobeButton onOpen={() => setShowWardrobe(true)} />
            </>
          )}
          {showWardrobe && (
            <Wardrobe
              look={look}
              onSave={saveWardrobe}
              onClose={() => setShowWardrobe(false)}
            />
          )}
          {readStore("visited") !== "true" && showPopup && (
            <Popup
              setShowPopup={setShowPopup}
              onCustomise={() => setShowWardrobe(true)}
            ></Popup>
          )}
          {showHelp && <HelpPopup setShowHelp={setShowHelp}></HelpPopup>}
          {showArcade && inTown && <Arcade onClose={() => setShowArcade(false)} />}
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
          setIsFighting={setIsFighting}
          showHud={!loading}
          currentScene={currentScene}
          enteringScene={enteringScene}
          setEnteringScene={setEnteringScene}
          onEntered={finishEntering}
          look={look}
          netStateRef={room.localState}
          roomPeers={room.peers}
          roomRef={room.roomRef}
          chatMessages={room.messages}
          games={games}
          onArcade={openArcade}
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
