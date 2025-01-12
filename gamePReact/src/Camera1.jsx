import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

const CAMERA_OFFSET = new THREE.Vector3(160, 120, 160);

const CameraControls = ({ characterRef }) => {
  const { camera } = useThree();

  useFrame(() => {
    if (characterRef.current) {
      const targetPosition = characterRef.current.position
        .clone()
        .add(CAMERA_OFFSET);
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(characterRef.current.position);
    }
  });

  return null;
};