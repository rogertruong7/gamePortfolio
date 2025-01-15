import React, { useRef, useEffect, useState } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

function Text({ text, position, fontPath, fontSize, color, cameraRef }) {
  const font = useLoader(FontLoader, fontPath);
  const meshRef = useRef();

  const geometry = new TextGeometry(text, {
    font: font,
    size: fontSize,
    depth: 5,
  });

  // center the geometry over position
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox;
  const offsetX = (boundingBox.max.x - boundingBox.min.x) / 2;
  const offsetY = (boundingBox.max.y - boundingBox.min.y) / 2;
  const offsetZ = (boundingBox.max.z - boundingBox.min.z) / 2;
  geometry.translate(-offsetX, -offsetY, -offsetZ);

  // .current property is used with the useRef hook to access the underlying DOM element
  useFrame(() => {
    if (meshRef.current && cameraRef.current) {
      meshRef.current.lookAt(cameraRef.current.position);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={position}>
      <meshPhongMaterial color={color} />
    </mesh>
  );
}

export default Text;
