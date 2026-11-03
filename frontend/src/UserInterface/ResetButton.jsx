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
  bottom: 20px;
  right: 20px;
  z-index: 103;
  width: 80px;
`;

const ResetButton = ({ setReseted, setCurrentScene }) => {
  const handleReset = () => {
    setReseted(true);
    setCurrentScene(0);
  };
  return (
    <>
      <Button onClick={handleReset}>
        reset
        <ChromeFrame />
      </Button>
    </>
  );
};

export default ResetButton;
