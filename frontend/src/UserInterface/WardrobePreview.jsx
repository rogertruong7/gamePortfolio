import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import styled from "styled-components";
import { useCharacterModel } from "../Game/look/useCharacterModel.js";
import { EMOTES, applyEmotePose, createEmoteState, findEmoteBones, startEmote, updateEmote } from "../Game/emotes.js";

// The model faces away from +z, so this turns it round to face the camera
const FACING_CAMERA = Math.PI;
// A slow turn on its own, so the back of the look shows too, until the player drags it round
const SPIN_SPEED = 0.45;
const RESUME_SPIN_AFTER_MS = 2500;
const DRAG_TURN = 0.012;
const IDLE_ANIMATION_SPEED = 0.06;
const WAVE = EMOTES.find((emote) => emote.id === "wave");
// The wave lasts until the player moves, which never happens here, so it stops after this long
const WAVE_SECONDS = 2.6;

function Character({ look, turn }) {
  const { model, animations, dress } = useCharacterModel(look);
  const { camera } = useThree();
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const emoteBones = useMemo(
    () => findEmoteBones(model, dress.uniforms.uLeftArmInFront),
    [model, dress]
  );
  const emote = useRef(createEmoteState());

  // Frames the model once: the camera looks at its middle from far enough to fit it all in
  useLayoutEffect(() => {
    model.rotation.set(0, FACING_CAMERA, 0);
    model.updateMatrixWorld(true);
    // The skinned shapes are measured from their bones, which aren't set up until the first draw
    model.traverse((node) => {
      if (node.isSkinnedMesh) node.skeleton.update();
    });
    const box = new THREE.Box3().setFromObject(model);
    const centre = box.getCenter(new THREE.Vector3());
    const height = box.max.y - box.min.y;
    const distance = (height * 0.74) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(centre.x, centre.y + height * 0.12, centre.z + distance);
    camera.lookAt(centre.x, centre.y - height * 0.07, centre.z);
  }, [model, camera]);

  useEffect(() => {
    if (animations.length === 0) return undefined;
    mixer.clipAction(animations[0]).play();
    return () => mixer.stopAllAction();
  }, [mixer, animations]);

  // Waves whenever the look changes, to show it off
  useEffect(() => {
    startEmote(emote.current, WAVE);
  }, [look]);

  useFrame((_, delta) => {
    const state = turn.current;
    if (!state.dragging && performance.now() - state.releasedAt > RESUME_SPIN_AFTER_MS) {
      state.angle += delta * SPIN_SPEED;
    }
    model.rotation.y = FACING_CAMERA + state.angle;
    mixer.update(delta * IDLE_ANIMATION_SPEED);
    // It has no camera of its own to turn towards
    const waved = emote.current.seconds > WAVE_SECONDS;
    updateEmote(emote.current, delta, waved, model, camera, () => {});
    applyEmotePose(emote.current, emoteBones);
  });

  return <primitive object={model} />;
}

const Stage = styled.div`
  position: relative;
  height: 100%;
  border-radius: 18px;
  overflow: hidden;
  /* Sideways drags turn the character, and up and down still scrolls the options */
  touch-action: pan-y;
  cursor: grab;
  background:
    radial-gradient(ellipse 34% 6% at 50% 86%, rgba(20, 35, 90, 0.22), transparent 70%),
    linear-gradient(#a9dcf3 0%, #e4f5fc 64%, #c9e7b9 64%, #a8d695 100%);
  box-shadow: inset 0 0 0 2px rgba(20, 35, 90, 0.12);

  &:active {
    cursor: grabbing;
  }

  canvas {
    display: block;
  }
`;

// The character on its patch of grass. Drag to turn it.
const WardrobePreview = ({ look }) => {
  const turn = useRef({ angle: 0, dragging: false, lastX: 0, releasedAt: -Infinity });

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    turn.current.dragging = true;
    turn.current.lastX = event.clientX;
  };
  const onPointerMove = (event) => {
    const state = turn.current;
    if (!state.dragging) return;
    state.angle += (event.clientX - state.lastX) * DRAG_TURN;
    state.lastX = event.clientX;
  };
  const onPointerUp = () => {
    turn.current.dragging = false;
    turn.current.releasedAt = performance.now();
  };

  return (
    <Stage
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label="Preview of your character. Drag to turn it."
    >
      <Canvas camera={{ fov: 26, near: 0.1, far: 2000 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <Suspense fallback={null}>
          <Character look={look} turn={turn} />
        </Suspense>
      </Canvas>
    </Stage>
  );
};

export default WardrobePreview;
