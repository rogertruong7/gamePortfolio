import { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";

import Lights from "./Lights.jsx";
import MainCamera from "./MainCamera.jsx";
import Character from "./Character.jsx";
import Floor from "./Floor.jsx";
import Buildings from "./Buildings.jsx";
import Text from "./Text.jsx";
import Details from "./Details.jsx";
import DarkSpot from "./Darkspot.jsx";
import Doorway from "./Doorway.jsx";
import { labels } from "./Static.jsx";

let startPosition = [93, -8, -134];
let startVector = new THREE.Vector3(...startPosition);

function MainGame({
  setLoading,
  setEnterPopupVisible,
  setProjectButton,
  setAboutButton,
  setExperiencesButton,
  setSkillsButton,
  setTwoOptionsButton,
  setOneOptionButton,
  reseted,
  setReseted,
  setProgress,
  setIsMoving,
  currentScene
}) {
  const characterRef = useRef();
  const cameraRef = useRef();
  const floorRef = useRef();

  const [playerPos, setPlayerPos] = useState(startVector);
  const [clickMoving, setClickMoving] = useState(false);
  const [darkSpot, setDarkspot] = useState(false);
  const [darkSpotPos, setDarkspotPos] = useState("");
  const [keys, setKeys] = useState({});
  const [targetPosition, setTargetPosition] = useState(
    new THREE.Vector3(...startPosition)
  );

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

  function RendererSettings() {
    const { gl } = useThree();
    useEffect(() => {
      // Set clear color
      gl.setClearColor(0x87ceeb); //0xfad998 0xffd9d9 0xffd8d1 0xe3fcff

      // Enable shadows
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFShadowMap;

      // Set pixel ratio for better rendering on high-DPI screens
      gl.setPixelRatio(devicePixelRatio);
    }, [gl]);

    return null;
  }

  function onWindowBlur() {
    setKeys({}); // Clear all keys
  }

  function onKeyDown(event) {
    if (currentScene !== 0) return;
    setKeys((prevKeys) => ({
      ...prevKeys,
      [event.key.toLowerCase()]: true,
    }));
  }

  function onKeyUp(event) {
    setKeys((prevKeys) => ({
      ...prevKeys,
      [event.key.toLowerCase()]: false,
    }));
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
      characterRef.current.position.copy(startVector);
      characterRef.current.rotation.y = -Math.PI / 4;
      setKeys({});
    }
    setReseted(false);
  }, [reseted]);

  useEffect(() => {
    const anyKeyActive = Object.values(keys).some((v) => v === true);
    setIsMoving(clickMoving || anyKeyActive);
  }, [clickMoving, keys, setIsMoving]);

  return (
    <>
      <Canvas id="gameCanvas" shadows>
        <RendererSettings />
        <ResizeHandler />
        <MainCamera ref={cameraRef} playerPos={playerPos} />
        <Lights />
        <Floor
          ref={floorRef}
          setDarkspot={setDarkspot}
          setClickMoving={setClickMoving}
          setDarkspotPos={setDarkspotPos}
          setTargetPosition={setTargetPosition}
          cameraRef={cameraRef}
        />
        <Buildings setLoading={setLoading} setProgress={setProgress} />
        <Details />
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
        />
        {labels.map(({ text, position, fontSize }, index) => (
          <Text
            key={text}
            text={text}
            position={position}
            fontPath="fonts/PixelifySans_Regular.json"
            fontSize={fontSize}
            color="#ff8080"
            cameraRef={cameraRef}
          />
        ))}
        {darkSpot && <DarkSpot darkSpotPos={darkSpotPos} />}

        <Doorway
          characterRef={characterRef}
          setEnterPopupVisible={setEnterPopupVisible}
          setProjectButton={setProjectButton}
          setAboutButton={setAboutButton}
          setExperiencesButton={setExperiencesButton}
          setSkillsButton={setSkillsButton}
          setTwoOptionsButton={setTwoOptionsButton}
          setOneOptionButton={setOneOptionButton}
        />
      </Canvas>
    </>
  );
}

export default MainGame;
