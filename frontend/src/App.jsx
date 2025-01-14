import React, { useRef, useEffect, useState } from "react";
import MainGame from "./Game/MainGame.jsx";
import LoadingScreen from "./UserInterface/LoadingScreen.jsx";
import Menu from "./UserInterface/Menu.jsx";
import "./App.css";

document.body.style.cursor = "grab";

const App = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [loading, setLoading] = useState(true);
  return (
    <>
      <Menu />
      {loading && currentScene === 0 && <LoadingScreen />}
      {currentScene === 0 && <MainGame setLoading={setLoading} />}
      {currentScene === 1 && <h1>Bye</h1>}
      {currentScene === 2 && <h1>Hello</h1>}
    </>
  );
};

export default App;
