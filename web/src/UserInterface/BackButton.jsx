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
  top: 20px;
  left: 20px;
  z-index: 103;
`;

const BackButton = ({ setCurrentScene }) => {
  return (
    <>
      <Button onClick={() => setCurrentScene(0)}>
        home
        <ChromeFrame spikes={false} />
      </Button>
    </>
  );
};

export default BackButton;
