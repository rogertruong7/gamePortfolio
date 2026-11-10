import { useEffect, useRef } from "react";
import styled from "styled-components";
import { chromeButton } from "./ChromeFrame.jsx";
import { isModalOpen } from "../Helpers/modal.js";
import { isActionKey } from "../Helpers/confirmKeys.js";

const PopupContainer = styled.div`
  font-size: 28px;
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 30px;
  padding-bottom: 50px;
  margin: auto;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 120px;
  z-index: 102;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  text-align: center;
`;

const Title = styled.p`
  margin-top: 10px;
  color: white;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 26px;
  width: 100%;
`;

export const ChoiceButton = styled.button`
  ${chromeButton}
  position: relative;
  width: 45%;
  text-align: center;
  z-index: 102;
  padding: 10px 15px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
`;

// The first button takes focus whenever focusKey changes
const ChoicePopup = ({ title, titleId, focusKey, children }) => {
  const containerRef = useRef(null);

  // E or Z goes with whichever button is focused, as Enter would
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!isActionKey(event) || event.repeat || isModalOpen()) return;
      const container = containerRef.current;
      const button = container?.contains(document.activeElement)
        ? document.activeElement
        : container?.querySelector("button");
      button?.click();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    containerRef.current?.querySelector("button")?.focus();
  }, [focusKey]);

  // Space is the jump key, so it mustn't also press whichever button has focus
  const blockSpace = (e) => {
    if (e.key === " ") e.preventDefault();
  };

  const handleKeyDown = (e) => {
    blockSpace(e);
    if (e.key === "Tab") {
      const buttons = containerRef.current?.querySelectorAll("button");
      if (!buttons || buttons.length === 0) return;
      e.preventDefault();
      const currentIndex = Array.from(buttons).indexOf(document.activeElement);
      const nextIndex = e.shiftKey
        ? (currentIndex - 1 + buttons.length) % buttons.length
        : (currentIndex + 1) % buttons.length;
      buttons[nextIndex].focus();
    }
  };

  return (
    <PopupContainer ref={containerRef} onKeyDown={handleKeyDown} onKeyUp={blockSpace}>
      <Title id={titleId}>{title}</Title>
      <ButtonRow>{children}</ButtonRow>
    </PopupContainer>
  );
};

export default ChoicePopup;
