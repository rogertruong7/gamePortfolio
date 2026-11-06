import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useTypedLength } from "../Helpers/useTypedLength.js";
import DialogBox from "./DialogBox.js";

const TYPING_DELAY = 40;
// How long the finished line stays up before the player is let out
const LINGER_MS = 1800;

// Sits exactly over the room's own text box: the bottom half of the screen, as wide as the room
const Box = styled(DialogBox)`
  position: fixed;
  top: auto;
  bottom: 0;
  z-index: 120;
  width: min(1100px, 95vw);
  height: 50%;
  min-height: 0;
  align-items: flex-start;
  padding: clamp(14px, 3vw, 44px) clamp(14px, 4vw, 56px);
  font-size: clamp(1rem, 0.75rem + 1vw, 1.9rem);

  @media (max-width: 650px) {
    width: 100%;
    height: 62%;
    border-width: 6px;
  }
`;

// The cat's goodbye, typed out over the room before it closes. A click or key finishes the
// typing, and another one leaves straight away.
const FarewellDialog = ({ line, onDone }) => {
  const [typed, setTyped] = useState(false);
  const finishTyping = useCallback(() => setTyped(true), []);
  const shown = useTypedLength(line, TYPING_DELAY, typed, finishTyping);

  useEffect(() => {
    if (!typed) return;
    const timer = setTimeout(onDone, LINGER_MS);
    return () => clearTimeout(timer);
  }, [typed, onDone]);

  // Read from a ref so one listener handles every press, and a single click can't both finish the
  // typing and then leave as the listener is swapped mid-click
  const typedRef = useRef(false);
  typedRef.current = typed;

  useEffect(() => {
    const advance = (event) => {
      if (event.type === "keydown" && (event.repeat || event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      event.stopPropagation();
      if (typedRef.current) {
        onDone();
      } else {
        typedRef.current = true;
        setTyped(true);
      }
    };
    // Capturing first keeps the room underneath from also acting on the click or key
    window.addEventListener("click", advance, true);
    window.addEventListener("keydown", advance, true);
    return () => {
      window.removeEventListener("click", advance, true);
      window.removeEventListener("keydown", advance, true);
    };
  }, [onDone]);

  return (
    <Box role="status">
      <span aria-hidden="true">*</span>
      <div>{line.slice(0, shown)}</div>
    </Box>
  );
};

export default FarewellDialog;
