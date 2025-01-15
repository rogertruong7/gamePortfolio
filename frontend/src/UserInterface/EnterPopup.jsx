import React from "react";
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
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 120px;
  z-index: 103;
  border-radius: 10px;
  justify-content: center;
  align-items: center;
  text-align: center;
  border: 4px dashed white;
`;

const OptionText = styled.p`
  margin-top: 10px;
  color: white;
  display: ${(props) => (props.visible ? "block" : "none")};
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
  display: ${(props) => (props.visible ? "block" : "none")};
  width: 45%;
  text-align: center;
  font-family: "Pixelify Sans", serif;
  z-index: 102;
  background-color: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;

  &:hover {
    background-color: rgba(0, 0, 0, 0.6);
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
  return (
    <>
      <EntrancePopupContainer>
        <OptionText id="twoOptions">Where would you like to go?</OptionText>
        <OptionText
          visible={oneOptionButton ? "visible" : undefined}
          id="oneOption"
        >
          Go in?
        </OptionText>
        <EnterButtonsContainer>
          <EnterButton
            visible={aboutButton ? "visible" : undefined}
            id="aboutme_button"
            onClick={() => setCurrentScene(1)}
          >
            Enter About Me
          </EnterButton>
          <EnterButton
            visible={projectButton ? "visible" : undefined}
            id="projects_button"
            onClick={() => setCurrentScene(2)}
          >
            Enter Projects
          </EnterButton>
          <EnterButton
            visible={experiencesButton ? "visible" : undefined}
            id="experience_button"
            onClick={() => setCurrentScene(3)}
          >
            Enter Experiences
          </EnterButton>
          <EnterButton
            visible={skillsButton ? "visible" : undefined}
            id="skills_button"
            onClick={() => setCurrentScene(4)}
          >
            Enter Skills
          </EnterButton>
        </EnterButtonsContainer>
      </EntrancePopupContainer>
    </>
  );
};

export default EnterPopup;
