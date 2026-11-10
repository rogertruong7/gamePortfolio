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
  bottom: 20px;
  right: 20px;
  z-index: 103;
  width: 80px;
  ${({ $afterHome }) => topLeftSlot(1, $afterHome)}
`;

const ResetButton = ({ setReseted, setCurrentScene, afterHome }) => {
  const handleReset = () => {
    setReseted(true);
    setCurrentScene(0);
  };
  return (
    <>
      <Button onClick={handleReset} $afterHome={afterHome}>
        reset
        <ChromeFrame />
      </Button>
    </>
  );
};

export default ResetButton;
