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
      <directionalLight
        color={0xf5d1ab}
        intensity={1}
        position={[100, 300, -200]}
        shadow-camera-near={0.5}
        shadow-camera-far={1200}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={300}
        shadow-camera-bottom={-100}
      />
      <ambientLight color={0xffffff} intensity={1} />
      {/* <rectAreaLight
        color={0xffffff}
        intensity={2}
        position={[59, 10, -58]}
        width={50}
        height={15}
        rotation={[0, Math.PI / 2, 0]}
      />
      <rectAreaLight
        color={0xffffff}
        intensity={3}
        position={[59, 10, -100]}
        width={20}
        height={15}
        rotation={[0, Math.PI / 2, 0]}
      />
      <rectAreaLight
        color={0xffffff}
        intensity={2}
        position={[59, 10, -172]}
        width={20}
        height={20}
        rotation={[0, Math.PI / 2, 0]}
      />
      <rectAreaLight
        color={0xffffff}
        intensity={3}
        position={[120, 10, -195]}
        width={10}
        height={10}
        rotation={[0, 0, 0]}
      />
      <rectAreaLight
        color={0xffffff}
        intensity={3}
        position={[200, 10, -195]}
        width={10}
        height={30}
        rotation={[0, 0, 0]}
      /> */}
    </>
  );
}

export default Lights;
