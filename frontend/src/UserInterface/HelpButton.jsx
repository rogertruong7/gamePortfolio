import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { topLeftSlot } from "./hudCorner.js";

const Button = styled.button`
  font-family: "Pixelify Sans", serif;
  ${chromeButton}
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  position: absolute;
  bottom: ${({ $aboveEmotes }) => ($aboveEmotes ? 144 : 82)}px;
  right: 20px;
  z-index: 103;
  width: 80px;
  ${({ $aboveEmotes }) => topLeftSlot(0, !$aboveEmotes)}
`;

const HelpButton = ({ setShowHelp, aboveEmotes }) => {
  const showHelp = () => {
    setShowHelp(true);
  };
  
  return (
    <>
      <Button onClick={showHelp} $aboveEmotes={aboveEmotes}>
        ?
        <ChromeFrame />
      </Button>
    </>
  );
};

export default HelpButton;
