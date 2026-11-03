import { useRef, useEffect } from "react";
import styled from "styled-components";
import { Howl } from "howler";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";

// Styled-components for the different elements
const EntrancePopupContainer = styled.div`
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

const OptionText = styled.p`
  margin-top: 10px;
  color: white;
`;

const EnterButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 26px;
  width: 100%;
`;

const EnterButton = styled.button`
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

const EnterPopup = ({
  twoOptionsButton,
  oneOptionButton,
  projectButton,
  aboutButton,
  experiencesButton,
  skillsButton,
  setCurrentScene,
}) => {
  const doorSound = useRef(
    new Howl({ src: ["/audio/door-open.mp3"], volume: 0.35 })
  );

  const enterScene = (scene) => {
    doorSound.current.play();
    setCurrentScene(scene);
  };

  const containerRef = useRef(null);

  useEffect(() => {
    const firstButton = containerRef.current?.querySelector("button");
    if (firstButton) {
      firstButton.focus();
    }
  }, [aboutButton, projectButton, experiencesButton, skillsButton]);

  const handleKeyDown = (e) => {
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
    <EntrancePopupContainer ref={containerRef} onKeyDown={handleKeyDown}>
      {twoOptionsButton && (
        <OptionText id="twoOptions">Where would you like to go?</OptionText>
      )}
      {oneOptionButton && <OptionText id="oneOption">Go in?</OptionText>}
      <EnterButtonsContainer>
        {aboutButton && (
          <EnterButton id="aboutme_button" onClick={() => enterScene(1)}>
            Enter About Me
            <ChromeFrame />
          </EnterButton>
        )}
        {projectButton && (
          <EnterButton id="projects_button" onClick={() => enterScene(2)}>
            Enter Projects
            <ChromeFrame />
          </EnterButton>
        )}
        {experiencesButton && (
          <EnterButton
            id="experience_button"
            onClick={() => enterScene(3)}
          >
            Enter Experience
            <ChromeFrame />
          </EnterButton>
        )}
        {skillsButton && (
          <EnterButton id="skills_button" onClick={() => enterScene(4)}>
            Enter Skills
            <ChromeFrame />
          </EnterButton>
        )}
      </EnterButtonsContainer>
    </EntrancePopupContainer>
  );
};

export default EnterPopup;
