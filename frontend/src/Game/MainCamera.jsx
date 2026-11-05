import React, { useEffect, useRef, useState } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { turnTowardsAngle } from "./angles.js";
import { bendCameraToReflection } from "./lake";

const CAMERA_OFFSET = new THREE.Vector3(140, 90, 140);
const CAMERA_ROTATION_SPEED = 0.0012;
// How close the camera comes during an emote, as a fraction of its usual distance
const EMOTE_ZOOM = 0.7;

// When nobody's touched anything, including the cursor, the camera drifts back to its centred
// angle, looking in from the front corner, and slowly sways from side to side around that
const IDLE_AFTER_SECONDS = 8;
const IDLE_SWAY_RANGE = 0.42;
const IDLE_SWAY_SPEED = 0.22;
const IDLE_RETURN_SECONDS = 4;
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const _rotationQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _cameraOffset = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

const MainCamera = React.forwardRef(({ playerPos, resetAngleRef, lakeRef, emoteRef }, ref) => {
  const [aspect, setAspect] = useState(window.innerWidth / window.innerHeight);
  const rotationRef = useRef(new THREE.Vector2(0, 0));
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const lastPlayerPos = useRef(playerPos.clone());
  const cursorMoved = useRef(false);
  const idle = useRef({ seconds: 0, swayTime: 0, returned: 0 });

  useEffect(() => {
    // PlayerShadow draws on this layer, which keeps it out of the water's reflection
    ref.current.layers.enable(1);
  }, [ref]);

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
      const lake = lakeRef.current;
      // The picture is upside down, so the camera turns the other way to follow the mouse
      const direction = lake.flipped ? -1 : 1;
      const deltaX = (event.clientX - previousMousePosition.current.x) * direction;
      const deltaY = (event.clientY - previousMousePosition.current.y) * direction;
      const rot = rotationRef.current;
      previousMousePosition.current = { x: event.clientX, y: event.clientY };
      if (lake.phase !== "none") return;

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
  }, [lakeRef]);

  useEffect(() => {
    // On the window, so the cursor counts when it's over the buttons too
    const onCursorMove = () => {
      cursorMoved.current = true;
    };
    window.addEventListener("mousemove", onCursorMove);
    return () => window.removeEventListener("mousemove", onCursorMove);
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const camera = ref.current;
    const rot = rotationRef.current;
    const state = idle.current;

    if (resetAngleRef.current) {
      resetAngleRef.current = false;
      rot.set(0, 0);
      state.seconds = 0;
      state.swayTime = 0;
      state.returned = 0;
    }

    // Where the camera is really looking, part way from where it was left to the swaying angle
    const blend = THREE.MathUtils.smoothstep(state.returned, 0, 1);
    const sway = Math.sin(state.swayTime * IDLE_SWAY_SPEED) * IDLE_SWAY_RANGE;
    const shownX = rot.x * (1 - blend);
    const shownY = turnTowardsAngle(rot.y, sway, blend);

    const playerMoved = lastPlayerPos.current.distanceToSquared(playerPos) > 0.0001;
    lastPlayerPos.current.copy(playerPos);

    const lake = lakeRef.current;
    const active =
      playerMoved || isDraggingRef.current || cursorMoved.current || lake.reflection > 0;
    cursorMoved.current = false;

    if (active) {
      // Stop right where the sway has got to, so the view doesn't jump
      rot.set(shownX, shownY);
      state.seconds = 0;
      state.swayTime = 0;
      state.returned = 0;
    } else if (!REDUCED_MOTION) {
      state.seconds += delta;
      if (state.seconds > IDLE_AFTER_SECONDS) {
        state.swayTime += delta;
        state.returned = Math.min(1, state.returned + delta / IDLE_RETURN_SECONDS);
      }
    }

    _euler.set(shownX, shownY, 0);
    _rotationQuat.setFromEuler(_euler);

    _cameraOffset.copy(CAMERA_OFFSET);
    _cameraOffset.applyQuaternion(_rotationQuat);
    // The camera always glides towards where it should be, so this eases in and out by itself
    if (emoteRef.current.emote) _cameraOffset.multiplyScalar(EMOTE_ZOOM);
    if (_cameraOffset.y < 10) _cameraOffset.y = 10;

    _targetPos.copy(playerPos).add(_cameraOffset);
    _lookAt.copy(playerPos);
    bendCameraToReflection(lake, _targetPos, _lookAt, playerPos);
    camera.position.lerp(_targetPos, 0.1);
    camera.lookAt(_lookAt);
    camera.rotateZ(lake.roll);
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
