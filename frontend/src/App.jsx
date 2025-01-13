import React from "react";
import Game from "./Game/Game.jsx";

const App = () => {
  return (
    <>
      <h1>Hello</h1>
      <div style={{ position: "relative", height: "100vh" }}>
        <Game />
        <button
          onClick={() => window.location.reload()}
          style={{ position: "absolute", top: 10, left: 10 }}
        >
          Reset
        </button>
      </div>
    </>
  );
};

export default App;
