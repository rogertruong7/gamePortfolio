import { useCallback, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";

import Backdrop from "./Backdrop.jsx";
import Lights from "./Lights.jsx";
import MainCamera from "./MainCamera.jsx";
import Character from "./Character.jsx";
import PlayerShadow from "./PlayerShadow.jsx";
import RemotePlayers from "./RemotePlayers.jsx";
import Floor from "./Floor.jsx";
import Island from "./Island.jsx";
import Buildings from "./Buildings.jsx";
import Text from "./Text.jsx";
import Details from "./Details.jsx";
import DarkSpot from "./Darkspot.jsx";
import Doorway from "./Doorway.jsx";
import UnderwaterFilter from "./UnderwaterFilter.jsx";
import SuperSaiyan from "./SuperSaiyan.jsx";
import SitPrompt from "../UserInterface/SitPrompt.jsx";
import LakePrompt from "../UserInterface/LakePrompt.jsx";
import SansFight from "../UserInterface/SansFight.jsx";
import { useAudio } from "../Audio/AudioContext.jsx";
import ReflectionDialog from "../UserInterface/ReflectionDialog.jsx";
import EmoteButton from "../UserInterface/EmoteButton.jsx";
import { benches, labels } from "./Static.jsx";
import { createSitState, startSitting, startStanding } from "./sitting.js";
import { seatAlong } from "./benchSeats.js";
import { startWalkingIn, startWalkingOut } from "./doorWalk.js";
import { EMOTES, createEmoteState, startEmote, stopEmote } from "./emotes.js";
import { createJumpState, requestJump } from "./jumping.js";
import { isModalOpen } from "../Helpers/modal.js";
import {
  createLakeState,
  endFight,
  isJumping,
  resetLake,
  startJump,
  startReflection,
  stopReflection,
} from "./lake.js";

let startPosition = [93, -8, -134];
let startVector = new THREE.Vector3(...startPosition);
// PlayerShadow needs the stencil buffer, which three.js leaves off by default
const RENDERER_OPTIONS = { stencil: true };
const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowleft",
  "arrowdown",
  "arrowright",
]);

function ResizeHandler() {
  // gl is renderer
  const { gl } = useThree();
  useEffect(() => {
    const handleResize = () => {
      gl.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [gl]);

  return null;
}

function MainGame({
  setLoading,
  setEnterPopupVisible,
  setProjectButton,
  setAboutButton,
  setExperiencesButton,
  setSkillsButton,
  setTwoOptionsButton,
  reseted,
  setReseted,
  setProgress,
  setIsMoving,
  setIsWading,
  setIsPlunging,
  setIsFighting,
  showHud,
  currentScene,
  enteringScene,
  setEnteringScene,
  onEntered,
  look,
  netStateRef,
  roomPeers,
  roomRef,
}) {
  const characterRef = useRef();
  const cameraRef = useRef();
  const floorRef = useRef();
  const sitRef = useRef(createSitState());
  const doorWalkRef = useRef(null);
  const lakeRef = useRef(createLakeState());
  const emoteRef = useRef(createEmoteState());
  const jumpRef = useRef(createJumpState());
  const resetCameraAngleRef = useRef(false);
  const [walkingOut, setWalkingOut] = useState(false);

  const [sitPhase, setSitPhase] = useState("none");
  const [nearBench, setNearBench] = useState(null);
  const [inWater, setInWater] = useState(false);
  const [lakePhase, setLakePhase] = useState("none");
  const [flipped, setFlipped] = useState(false);
  const [fightOpen, setFightOpen] = useState(false);
  const [beatSans, setBeatSans] = useState(false);
  // The town stops drawing while the fight fills the screen, so the two don't compete for frames
  const [fightCovers, setFightCovers] = useState(false);
  const { muted } = useAudio();
  const [playerPos, setPlayerPos] = useState(startVector);
  const [clickMoving, setClickMoving] = useState(false);
  const [darkSpot, setDarkspot] = useState(false);
  const [darkSpotPos, setDarkspotPos] = useState("");
  const [keys, setKeys] = useState({});
  const [targetPosition, setTargetPosition] = useState(
    new THREE.Vector3(...startPosition)
  );

  function onWindowBlur() {
    setKeys({}); // Clear all keys
  }

  function sitDown() {
    setDarkspot(false);
    setClickMoving(false);
    // Takes the free end if someone's already there, and they scoot over to the other
    const room = roomRef.current;
    const along =
      seatAlong(
        { id: room?.id ?? "me", bench: benches.indexOf(nearBench), since: Date.now() },
        room ? room.benchClaims() : []
      ) ?? 0;
    startSitting(sitRef.current, nearBench, targetPosition, characterRef.current.position, along);
  }

  function standUp() {
    startStanding(sitRef.current);
  }

  // A key held down from before would otherwise call the view straight off again
  function stopWalking() {
    setDarkspot(false);
    setClickMoving(false);
    setKeys({});
  }

  function viewReflection() {
    stopWalking();
    startReflection(lakeRef.current, characterRef.current, cameraRef.current);
  }

  function jumpIntoLake() {
    stopWalking();
    if (!lakeRef.current.flipped) setFightOpen(true);
    startJump(lakeRef.current, characterRef.current);
  }

  const closeReflection = useCallback(() => stopReflection(lakeRef.current), []);
  const onFightCovered = useCallback(() => setFightCovers(true), []);
  const onFightEnd = useCallback(() => setFightCovers(false), []);
  const onFightClosed = useCallback((outcome) => {
    setFightOpen(false);
    if (outcome === "won") setBeatSans(true);
    // If it never loaded, nothing has covered the town, so it just carries on upside down
    endFight(lakeRef.current, characterRef.current, outcome !== "failed");
  }, []);

  function playEmote(emote) {
    if (sitRef.current.phase !== "none" || doorWalkRef.current) return;
    if (lakeRef.current.phase !== "none") return;
    setDarkspot(false);
    setClickMoving(false);
    setKeys({});
    startEmote(emoteRef.current, emote);
  }

  function onKeyDown(event) {
    if (currentScene !== 0) return;
    // macOS sends no keyup for a letter released while Cmd is held, so a shortcut
    // has to drop every key or the character would keep walking afterwards.
    if (event.metaKey || event.ctrlKey || event.altKey) {
      setKeys({});
      return;
    }
    if (event.code === "Space") {
      if (isModalOpen()) return;
      // Otherwise the page scrolls, or a focused button gets pressed
      event.preventDefault();
      if (!event.repeat) requestJump(jumpRef.current);
      return;
    }
    const key = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(key)) return;
    if (event.repeat && lakeRef.current.phase !== "none") return;
    setKeys((prevKeys) => ({ ...prevKeys, [key]: true }));
  }

  function onKeyUp(event) {
    const key = event.key.toLowerCase();
    if (!MOVEMENT_KEYS.has(key)) return;
    setKeys((prevKeys) => ({ ...prevKeys, [key]: false }));
  }

  useEffect(() => {
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [currentScene]);

  useEffect(() => {
    if (currentScene !== 0) {
      setKeys({});
      setClickMoving(false);
      setDarkspot(false);
    }
  }, [currentScene]);

  useEffect(() => {
    if (reseted === true) {
      // console.log("resetting");
      setDarkspot(false);
      setClickMoving(false);
      sitRef.current.phase = "none";
      resetLake(lakeRef.current);
      stopEmote(emoteRef.current);
      doorWalkRef.current = null;
      setWalkingOut(false);
      setEnteringScene(null);
      resetCameraAngleRef.current = true;
      characterRef.current.position.copy(startVector);
      characterRef.current.rotation.y = -Math.PI / 4;
      setKeys({});
      waveHello();
    }
    setReseted(false);
  }, [reseted]);

  // The character turns to the camera and waves as it appears, once the town has loaded and after
  // a reset puts it back at the start
  function waveHello() {
    startEmote(emoteRef.current, EMOTES.find(({ id }) => id === "wave"));
  }

  useEffect(() => {
    if (showHud) waveHello();
  }, [showHud]);

  useEffect(() => {
    if (enteringScene !== null) {
      doorWalkRef.current = startWalkingIn(enteringScene, characterRef.current.position);
    }
  }, [enteringScene]);

  // It waits inside the building while the page is open, then walks back out
  useEffect(() => {
    const walk = doorWalkRef.current;
    if (currentScene === 0 && walk?.finished) {
      doorWalkRef.current = startWalkingOut(walk.scene, characterRef.current);
      setWalkingOut(true);
    }
  }, [currentScene]);

  function onDoorWalkDone(walk) {
    if (walk.leaving) {
      doorWalkRef.current = null;
      setWalkingOut(false);
    } else {
      walk.finished = true;
      onEntered(walk.scene);
    }
  }

  useEffect(() => {
    setIsPlunging(lakePhase === "sinking");
  }, [lakePhase, setIsPlunging]);

  useEffect(() => {
    // The fight loads during the dive, which keeps its sounds until it's over
    setIsFighting(fightOpen && !isJumping(lakePhase));
  }, [fightOpen, lakePhase, setIsFighting]);

  useEffect(() => {
    const anyKeyActive = Object.values(keys).some((v) => v === true);
    setIsMoving(
      lakePhase === "none" &&
        (clickMoving ||
          anyKeyActive ||
          sitPhase === "approaching" ||
          enteringScene !== null ||
          walkingOut)
    );
  }, [clickMoving, keys, sitPhase, enteringScene, walkingOut, lakePhase, setIsMoving]);

  useEffect(() => {
    setIsWading(inWater);
  }, [inWater, setIsWading]);

  return (
    <>
      <Canvas
        id="gameCanvas"
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.5]}
        gl={RENDERER_OPTIONS}
        frameloop={currentScene === 0 && !fightCovers ? "always" : "never"}
      >
        <ResizeHandler />
        <Backdrop />
        <MainCamera
          ref={cameraRef}
          playerPos={playerPos}
          resetAngleRef={resetCameraAngleRef}
          lakeRef={lakeRef}
          emoteRef={emoteRef}
        />
        <Lights />
        <Floor
          ref={floorRef}
          setDarkspot={setDarkspot}
          setClickMoving={setClickMoving}
          setDarkspotPos={setDarkspotPos}
          setTargetPosition={setTargetPosition}
          cameraRef={cameraRef}
          lakeRef={lakeRef}
        />
        <Island />
        <Buildings setLoading={setLoading} setProgress={setProgress} />
        <Details characterRef={characterRef} lakeRef={lakeRef} />
        <Character
          ref={characterRef}
          position={startPosition}
          cameraRef={cameraRef}
          setPlayerPos={setPlayerPos}
          setDarkspot={setDarkspot}
          setClickMoving={setClickMoving}
          clickMoving={clickMoving}
          targetPosition={targetPosition}
          keys={keys}
          currentScene={currentScene}
          sitRef={sitRef}
          setSitPhase={setSitPhase}
          setNearBench={setNearBench}
          doorWalkRef={doorWalkRef}
          onDoorWalkDone={onDoorWalkDone}
          lakeRef={lakeRef}
          setInWater={setInWater}
          setLakePhase={setLakePhase}
          setFlipped={setFlipped}
          emoteRef={emoteRef}
          jumpRef={jumpRef}
          look={look}
          netStateRef={netStateRef}
          roomRef={roomRef}
        />
        <PlayerShadow characterRef={characterRef} lakeRef={lakeRef} look={look} />
        <RemotePlayers
          peers={roomPeers}
          roomRef={roomRef}
          lakeRef={lakeRef}
          localState={netStateRef}
        />
        {beatSans && <SuperSaiyan characterRef={characterRef} />}
        <group visible={!flipped}>
          {labels.map(({ text, position, fontSize, showcaseName }) => (
            <Text
              key={text}
              text={text}
              position={position}
              fontPath="fonts/PixelifySans_Regular.json"
              fontSize={fontSize}
              cameraRef={cameraRef}
              characterRef={characterRef}
              showcaseName={showcaseName}
            />
          ))}
        </group>
        {darkSpot && <DarkSpot darkSpotPos={darkSpotPos} />}

        <Doorway
          characterRef={characterRef}
          doorWalkRef={doorWalkRef}
          lakeRef={lakeRef}
          setEnterPopupVisible={setEnterPopupVisible}
          setProjectButton={setProjectButton}
          setAboutButton={setAboutButton}
          setExperiencesButton={setExperiencesButton}
          setSkillsButton={setSkillsButton}
          setTwoOptionsButton={setTwoOptionsButton}
        />
        {(flipped || isJumping(lakePhase)) && <UnderwaterFilter lakeRef={lakeRef} />}
      </Canvas>
      {sitPhase === "none" && nearBench && <SitPrompt label="Sit down" onPress={sitDown} />}
      {inWater && lakePhase === "none" && (
        <LakePrompt flipped={flipped} onReflect={viewReflection} onJump={jumpIntoLake} />
      )}
      {lakePhase === "reflecting" && <ReflectionDialog onClose={closeReflection} />}
      {fightOpen && (
        <SansFight
          ready={lakePhase === "fighting"}
          muted={muted}
          onCovered={onFightCovered}
          onEnd={onFightEnd}
          onClosed={onFightClosed}
        />
      )}
      {showHud && currentScene === 0 && sitPhase === "none" && (
        <EmoteButton onEmote={playEmote} />
      )}
      {sitPhase === "seated" && <SitPrompt label="Stand up" onPress={standUp} />}
    </>
  );
}

export default MainGame;
