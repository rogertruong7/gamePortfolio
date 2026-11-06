import ChromeFrame from "./ChromeFrame.jsx";
import ChoicePopup, { ChoiceButton } from "./ChoicePopup.jsx";

const LakePrompt = ({ flipped, onReflect, onJump }) => {
  if (flipped) {
    return (
      <ChoicePopup title="Go back up? (E)" titleId="lakeOption" focusKey="flipped">
        <ChoiceButton id="jump_out_button" onClick={onJump}>
          Jump back out
          <ChromeFrame />
        </ChoiceButton>
      </ChoicePopup>
    );
  }
  return (
    <ChoicePopup title="The water is still." titleId="lakeOptions" focusKey="normal">
      <ChoiceButton id="jump_in_button" onClick={onJump}>
        Jump
        <br />
        in
        <ChromeFrame />
      </ChoiceButton>
      <ChoiceButton id="reflection_button" onClick={onReflect}>
        View your reflection
        <ChromeFrame />
      </ChoiceButton>
    </ChoicePopup>
  );
};

export default LakePrompt;
