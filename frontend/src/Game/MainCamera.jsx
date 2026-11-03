import React, { useEffect, useRef, useState } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CAMERA_OFFSET = new THREE.Vector3(140, 90, 140);
const CAMERA_ROTATION_SPEED = 0.0012;

// When nobody's touched anything for a while, the camera slowly sways side to side
const IDLE_AFTER_SECONDS = 8;
const IDLE_SWAY_RANGE = 0.42;
const IDLE_SWAY_SPEED = 0.22;
const IDLE_SWAY_FADE_IN_SECONDS = 2;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const _rotationQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _cameraOffset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

const MainCamera = React.forwardRef(({ playerPos }, ref) => {
  const [aspect, setAspect] = useState(window.innerWidth / window.innerHeight);
  const rotationRef = useRef(new THREE.Vector2(0, 0));
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const lastPlayerPos = useRef(playerPos.clone());
  const idle = useRef({ seconds: 0, swayTime: 0, swayStrength: 0 });

  useEffect(() => {
    const handleResize = () => {
      setAspect(window.innerWidth / window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const onMouseDown = (event) => {
      isDraggingRef.current = true;
      previousMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onMouseLeave = () => {
      isDraggingRef.current = false;
    };

    const onMouseMove = (event) => {
      const deltaX = event.clientX - previousMousePosition.current.x;
      const deltaY = event.clientY - previousMousePosition.current.y;
      const rot = rotationRef.current;

      if (isDraggingRef.current) {
        rot.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, rot.x - deltaY * CAMERA_ROTATION_SPEED)
        );
        rot.y -= deltaX * CAMERA_ROTATION_SPEED;
      } else {
        rot.x -= deltaY * 0.00005;
        rot.y -= deltaX * 0.00005;
      }

      previousMousePosition.current = { x: event.clientX, y: event.clientY };
    };

    const canvas = document.getElementById("gameCanvas");
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("mousemove", onMouseMove);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const camera = ref.current;
    const rot = rotationRef.current;
    const state = idle.current;

    const swayAngle = () =>
      Math.sin(state.swayTime * IDLE_SWAY_SPEED) * IDLE_SWAY_RANGE * state.swayStrength;

    const playerMoved = lastPlayerPos.current.distanceToSquared(playerPos) > 0.0001;
    lastPlayerPos.current.copy(playerPos);

    if (playerMoved || isDraggingRef.current) {
      // Stop right where the sway has got to, so the view doesn't jump
      rot.y += swayAngle();
      state.seconds = 0;
      state.swayTime = 0;
      state.swayStrength = 0;
    } else if (!REDUCED_MOTION) {
      state.seconds += delta;
      if (state.seconds > IDLE_AFTER_SECONDS) {
        state.swayTime += delta;
        state.swayStrength = Math.min(1, state.swayStrength + delta / IDLE_SWAY_FADE_IN_SECONDS);
      }
    }

    _euler.set(rot.x, rot.y + swayAngle(), 0);
    _rotationQuat.setFromEuler(_euler);

    _cameraOffset.copy(CAMERA_OFFSET);
    _cameraOffset.applyQuaternion(_rotationQuat);
    if (_cameraOffset.y < 10) _cameraOffset.y = 10;

    _targetPos.copy(playerPos).add(_cameraOffset);
    camera.position.lerp(_targetPos, 0.1);
    camera.lookAt(playerPos);
  });

  return (
    <PerspectiveCamera
      makeDefault
      ref={ref}
      position={CAMERA_OFFSET}
      fov={60}
      aspect={aspect}
      near={1}
      far={2400}
    />
  );
});

export default MainCamera;
