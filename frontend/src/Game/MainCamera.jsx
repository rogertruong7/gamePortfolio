import React, { useEffect, useState } from "react";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { CAMERA_OFFSET } from "./MainGame";


const MainCamera = React.forwardRef(({ cameraPos }, ref) => {
  const [aspect, setAspect] = useState(window.innerWidth / window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setAspect(window.innerWidth / window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fov = 60; // Field of view
  const near = 0.1; // Near clipping plane
  const far = 1000; // Far clipping plane

  return (
    <>
      <PerspectiveCamera
        makeDefault
        ref={ref}
        position={CAMERA_OFFSET} // Set initial position here
        fov={fov}
        aspect={aspect}
        near={near}
        far={far}
      />
      <OrbitControls
        target={cameraPos}
        // enableZoom={false}
        dampingFactor={0.07}
        rotateSpeed={0.15}
      />
    </>
  );
});

export default MainCamera;
