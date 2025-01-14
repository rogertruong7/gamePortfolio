import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function DarkSpot({ 
  darkSpotPos
 }) {
  const darkSpotRef = useRef();

  return (
    <mesh
      ref={darkSpotRef}
      rotation={[-Math.PI / 2, 0, 0]} // Align with the floor
      position={[darkSpotPos.x, darkSpotPos.y + 1.5, darkSpotPos.z]} // Initial position
    >
      <circleGeometry args={[5, 6]} /> {/* Radius and segments */}
      <meshBasicMaterial color={0x000000} opacity={0.5} transparent />
    </mesh>
  );
}

export default DarkSpot;
