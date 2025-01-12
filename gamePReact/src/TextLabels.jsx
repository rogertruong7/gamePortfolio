import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text } from "@react-three/drei";
import * as THREE from "three";

// Need to add font 
const TextLabels = ({ labels }) => {
  return labels.map(({ text, position, fontSize }, index) => (
    <Text
      key={index}
      position={position}
      fontSize={fontSize}
      color="white"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  ));
};

const fontLoader = new FontLoader();
  fontLoader.load(fontPath, (font) => {
    const textGeometry = new TextGeometry(text, {
      font: font,
      size: fontSize,
      depth: 5,
    });
    textGeometry.computeBoundingBox();
    const boundingBox = textGeometry.boundingBox;
    const offsetX = (boundingBox.max.x - boundingBox.min.x) / 2;
    const offsetY = (boundingBox.max.y - boundingBox.min.y) / 2;
    const offsetZ = (boundingBox.max.z - boundingBox.min.z) / 2;

    textGeometry.translate(-offsetX, -offsetY, -offsetZ);
    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xe67ae2 });
  });

export default TextLabels;