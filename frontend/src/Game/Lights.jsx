import React from "react";

function Lights() {
  return (
    <>
      <directionalLight
        color={0xf5d1ab}
        intensity={1}
        position={[-100, 300, 200]}
        castShadow
        shadow-camera-near={0.5}
        shadow-camera-far={1200}
        shadow-camera-left={-400}
        shadow-camera-right={400}
        shadow-camera-top={400}
        shadow-camera-bottom={-400}
      />
      <ambientLight color={0xffffff} intensity={1.2} />
    </>
  );
}

export default Lights;
