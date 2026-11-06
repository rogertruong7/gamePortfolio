import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import styled from "styled-components";
import { SHOW_SAID_SECONDS } from "../Multiplayer/chat.js";

// What a character last said, floating over their head for a few seconds after they say it

// Measured from the feet. The head bone is about 9.6 up and the forehead about 6.4 past it, so
// this is just over the top of the hair.
const RISE = 20;
// Under the HUD buttons and popups, which start at 100
const Z_INDEX_RANGE = [99, 90];

const Bubble = styled.div`
  position: relative;
  transform: translate(-50%, -100%);
  max-width: 200px;
  width: max-content;
  padding: 5px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #2c3140;
  font-family: "Pixelify Sans", serif;
  font-size: 14px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
  pointer-events: none;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  /* Long messages are cut to three lines over the head. The chat has the whole thing. */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  animation: pop 0.15s ease-out;

  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -80%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// The tail pointing down at the speaker. Outside the bubble, as the bubble clips what overflows.
const Tail = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -2px);
  width: 0;
  height: 0;
  border: 6px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.92);
  pointer-events: none;
`;

function ChatBubble({ characterRef, message }) {
  const groupRef = useRef();
  const wrapRef = useRef();
  const [shown, setShown] = useState(message);

  // Each new message shows until it's been up long enough, or a newer one replaces it
  useEffect(() => {
    setShown(message);
    if (!message) return undefined;
    const left = SHOW_SAID_SECONDS * 1000 - (Date.now() - message.at);
    const timer = setTimeout(() => setShown(null), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [message]);

  useFrame(() => {
    const character = characterRef.current;
    const group = groupRef.current;
    if (!character || !group) return;
    group.position.set(character.position.x, character.position.y + RISE, character.position.z);
    // Hidden along with the character, such as while they're off in the upside-down town. The
    // bubble is on the page rather than in the scene, so it has to be hidden there too.
    if (wrapRef.current) wrapRef.current.style.display = character.visible ? "" : "none";
  });

  return (
    <group ref={groupRef}>
      {shown && (
        <Html zIndexRange={Z_INDEX_RANGE} style={{ pointerEvents: "none" }}>
          <div ref={wrapRef}>
            <Bubble key={shown.key}>{shown.text}</Bubble>
            <Tail />
          </div>
        </Html>
      )}
    </group>
  );
}

export default ChatBubble;
