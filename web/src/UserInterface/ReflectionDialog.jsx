import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import arrowdown from "../assets/arrowdown.gif";
import { isModalOpen } from "../Helpers/modal.js";
import { isActionKey } from "../Helpers/confirmKeys.js";
import { useTypedLength } from "../Helpers/useTypedLength.js";
import DialogBox from "./DialogBox.js";

const LINE = "Despite everything, it's still you.";
const TYPING_DELAY = 45;
// Clicking the town counts too, since it fills the rest of the screen, but the buttons around
// it should only do their own job
const ADVANCES_ON_CLICK = "#reflection_dialog, #gameCanvas";
const FOCUSABLE = "button, a, input";

const Arrow = styled.img`
  position: absolute;
  right: 20px;
  bottom: 16px;
  width: 30px;
  height: 50px;
`;

const ReflectionDialog = ({ onClose }) => {
  const [typed, setTyped] = useState(false);
  const finishTyping = useCallback(() => setTyped(true), []);
  const shown = useTypedLength(LINE, TYPING_DELAY, typed, finishTyping);
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
      } else if (isActionKey(event)) {
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
    <DialogBox id="reflection_dialog" role="status">
      <span aria-hidden="true">*</span>
      <div>{LINE.slice(0, shown)}</div>
      {typed && <Arrow src={arrowdown} alt="" />}
    </DialogBox>
  );
};

export default ReflectionDialog;
