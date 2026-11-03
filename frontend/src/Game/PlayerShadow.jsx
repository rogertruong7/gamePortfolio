import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// The town's shadows are only drawn once, so the character gets a simple soft
// shadow of its own that follows it around.
const FLOOR_HEIGHT = -7.4;
const RADIUS = 8;

function paintSoftCircle() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "rgba(0,0,0,.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function PlayerShadow({ characterRef }) {
  const shadowRef = useRef();
  const texture = useMemo(paintSoftCircle, []);

  useFrame(() => {
    if (!characterRef.current) return;
    const { x, z } = characterRef.current.position;
    shadowRef.current.position.set(x, FLOOR_HEIGHT, z);
  });

  return (
    <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[RADIUS, 20]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default PlayerShadow;
