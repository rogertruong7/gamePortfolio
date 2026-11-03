import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";

const Button = styled.button`
  font-family: "Pixelify Sans", serif;
  ${chromeButton}
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  position: absolute;
  bottom: 82px;
  right: 20px;
  z-index: 103;
  width: 80px;
`;

const HelpButton = ({ setShowHelp }) => {
  const showHelp = () => {
    setShowHelp(true);
  };
  
  return (
    <>
      <Button onClick={showHelp}>
        ?
        <ChromeFrame />
      </Button>
    </>
  );
};

export default HelpButton;
