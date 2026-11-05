import { useEffect, useState } from "react";
import styled from "styled-components";
import Typewriter from "typewriter-effect";
import arrowdown from "../assets/arrowdown.gif";
import { isModalOpen } from "../Helpers/modal.js";

const LINE = "Despite everything, it's still you.";
const TYPING_DELAY = 45;
// Clicking the town counts too, since it fills the rest of the screen, but the buttons around
// it should only do their own job
const ADVANCES_ON_CLICK = "#reflection_dialog, #gameCanvas";
const FOCUSABLE = "button, a, input";

const Box = styled.div`
  position: absolute;
  bottom: 4%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 102;
  box-sizing: border-box;
  width: min(1100px, 94vw);
  min-height: clamp(130px, 26vh, 260px);
  padding: clamp(20px, 4vw, 50px);
  border: 10px solid white;
  background-color: black;
  color: white;
  cursor: pointer;
  display: flex;
  gap: 0.6em;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1.2rem, 3.4vw, 3rem);
  font-weight: normal;
  line-height: 1.3;
`;

const Arrow = styled.img`
  position: absolute;
  right: 20px;
  bottom: 16px;
  width: 30px;
  height: 50px;
`;

const ReflectionDialog = ({ onClose }) => {
  const [typed, setTyped] = useState(false);
  useEffect(() => {
    // The first press finishes the typing, like the dialog boxes in the buildings
    const advance = () => {
      if (typed) onClose();
      else setTyped(true);
    };
    const onClick = (event) => {
      if (event.target.closest(ADVANCES_ON_CLICK) && !isModalOpen()) advance();
    };
    const onKeyDown = (event) => {
      if (event.repeat || isModalOpen()) return;
      if (event.key === "Escape") {
        onClose();
      } else if (event.key.toLowerCase() === "e") {
        advance();
      } else if (
        (event.code === "Space" || event.code === "Enter") &&
        !event.target.closest?.(FOCUSABLE)
      ) {
        advance();
      }
    };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [typed, onClose]);

  return (
    <Box id="reflection_dialog" role="status">
      <span aria-hidden="true">*</span>
      <div>
        {typed ? (
          LINE
        ) : (
          <Typewriter
            onInit={(typewriter) => {
              typewriter
                .changeDelay(TYPING_DELAY)
                .typeString(LINE)
                .callFunction(() => setTyped(true))
                .start();
            }}
          />
        )}
      </div>
      {typed && <Arrow src={arrowdown} alt="" />}
    </Box>
  );
};

export default ReflectionDialog;
