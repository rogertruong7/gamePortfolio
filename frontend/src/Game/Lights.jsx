import React from "react";

function Lights() {
  return (
    <>
      <directionalLight
        color={0xf5d1ab}
        intensity={1.5}
        position={[-100, 300, 200]}
        castShadow
        shadow-camera-near={0.5}
        shadow-camera-far={1200}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={300}
        shadow-camera-bottom={-100}
      />
      <ambientLight color={0xffffff} intensity={1} />
      <rectAreaLight
        color={0xffffff}
        intensity={4}
        position={[59, 15, -58]}
        width={20}
        height={15}
      />
    </>
  );
}

export default Lights;
