import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { sunPosition } from "./Static";

// The town doesn't move, so its shadows are drawn once instead of every frame.
// A few frames gives every model time to mount first.
const SHADOW_DRAW_FRAMES = 3;

function Lights() {
  const sunRef = useRef();
  const shadowFrames = useRef(0);

  useFrame(() => {
    if (shadowFrames.current >= SHADOW_DRAW_FRAMES) return;
    shadowFrames.current++;
    sunRef.current.shadow.autoUpdate = false;
    sunRef.current.shadow.needsUpdate = true;
  });

  return (
    <>
      <directionalLight
        ref={sunRef}
        color={0xf5d1ab}
        intensity={1.5}
        position={sunPosition}
        castShadow
        shadow-mapSize={[1024, 1024]}
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
