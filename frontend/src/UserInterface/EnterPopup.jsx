import { useRef, useEffect } from "react";
import styled from "styled-components";

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
  border: 4px dashed white;
`;

const OptionText = styled.p`
  margin-top: 10px;
  color: white;
`;

const EnterButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: 100%;
`;

const EnterButton = styled.button`
  border: 4px dashed white;
  width: 45%;
  text-align: center;
  font-family: "Pixelify Sans", serif;
  z-index: 102;
  background-color: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: rgba(0, 0, 0, 0.9);
    outline: 2px solid white;
    outline-offset: 2px;
  }
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
          <EnterButton id="aboutme_button" onClick={() => setCurrentScene(1)}>
            Enter About Me
          </EnterButton>
        )}
        {projectButton && (
          <EnterButton id="projects_button" onClick={() => setCurrentScene(2)}>
            Enter Projects
          </EnterButton>
        )}
        {experiencesButton && (
          <EnterButton
            id="experience_button"
            onClick={() => setCurrentScene(3)}
          >
            Enter Experience
          </EnterButton>
        )}
        {skillsButton && (
          <EnterButton id="skills_button" onClick={() => setCurrentScene(4)}>
            Enter Skills
          </EnterButton>
        )}
      </EnterButtonsContainer>
    </EntrancePopupContainer>
  );
};

export default EnterPopup;
