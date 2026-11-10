import ChromeFrame from "./ChromeFrame.jsx";
import ChoicePopup, { ChoiceButton } from "./ChoicePopup.jsx";

const EnterPopup = ({
  twoOptionsButton,
  projectButton,
  aboutButton,
  experiencesButton,
  skillsButton,
  enterScene,
}) => {
  return (
    <ChoicePopup
      title={twoOptionsButton ? "Where would you like to go?" : "Go in? (E)"}
      titleId={twoOptionsButton ? "twoOptions" : "oneOption"}
      focusKey={[aboutButton, projectButton, experiencesButton, skillsButton].join()}
    >
      {aboutButton && (
        <ChoiceButton id="aboutme_button" onClick={() => enterScene(1)}>
          Enter About Me
          <ChromeFrame />
        </ChoiceButton>
      )}
      {projectButton && (
        <ChoiceButton id="projects_button" onClick={() => enterScene(2)}>
          Enter Projects
          <ChromeFrame />
        </ChoiceButton>
      )}
      {experiencesButton && (
        <ChoiceButton id="experience_button" onClick={() => enterScene(3)}>
          Enter Experience
          <ChromeFrame />
        </ChoiceButton>
      )}
      {skillsButton && (
        <ChoiceButton id="skills_button" onClick={() => enterScene(4)}>
          Enter Skills
          <ChromeFrame />
        </ChoiceButton>
      )}
    </ChoicePopup>
  );
};

export default EnterPopup;
