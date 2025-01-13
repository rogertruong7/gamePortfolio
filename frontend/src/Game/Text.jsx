import React from "react";
import { useLoader } from "@react-three/fiber";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

function Text({ text, position, fontPath, fontSize, color }) {
  const font = useLoader(FontLoader, fontPath);

  const geometry = new TextGeometry(text, {
    font: font,
    size: fontSize,
    height: 5,
  });

  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox;
  const offsetX = (boundingBox.max.x - boundingBox.min.x) / 2;
  const offsetY = (boundingBox.max.y - boundingBox.min.y) / 2;
  const offsetZ = (boundingBox.max.z - boundingBox.min.z) / 2;
  geometry.translate(-offsetX, -offsetY, -offsetZ);

  return (
    <mesh geometry={geometry} position={position}>
      <meshPhongMaterial color={color} />
    </mesh>
  );
}

export default Text;
