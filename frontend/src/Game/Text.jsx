import React, { useRef, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

function Text({ text, position, fontPath, fontSize, color, cameraRef }) {
  const font = useLoader(FontLoader, fontPath);
  const meshRef = useRef();

  const geometry = useMemo(() => {
    const geo = new TextGeometry(text, { font, size: fontSize, depth: 5 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(
      -(bb.max.x - bb.min.x) / 2,
      -(bb.max.y - bb.min.y) / 2,
      -(bb.max.z - bb.min.z) / 2
    );
    return geo;
  }, [text, font, fontSize]);

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

export default React.memo(Text);
