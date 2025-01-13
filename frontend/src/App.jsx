import React, { useRef, useEffect, useState } from "react";
import MainGame from "./Game/MainGame.jsx";
import LoadingScreen from "./UserInterface/LoadingScreen.jsx";
import Menu from "./UserInterface/Menu.jsx";
import "./App.css";

const App = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [loading, setLoading] = useState(true);
  return (
    <>
      <Menu />
      {loading && (
        <LoadingScreen />
      )}
      {currentScene === 0 ? <MainGame setLoading={setLoading}/> : <h1>Hello</h1>}
    </>
  );
};

export default App;
