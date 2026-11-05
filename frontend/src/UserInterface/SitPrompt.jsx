import { useEffect } from "react";
import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { isModalOpen } from "../Helpers/modal.js";

const SitButton = styled.button`
  ${chromeButton}
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 102;
  padding: 12px 24px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
`;

const SitPrompt = ({ label, onPress }) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() === "e" && !event.repeat && !isModalOpen()) onPress();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPress]);

  return (
    <SitButton id="sit_button" onClick={onPress}>
      {label} (E)
      <ChromeFrame />
    </SitButton>
  );
};

export default SitPrompt;
