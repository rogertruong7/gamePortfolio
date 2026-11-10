import styled from "styled-components";

// The black Undertale text box with a thick white border, along the bottom of the screen
const DialogBox = styled.div`
  position: absolute;
  bottom: 4%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 102;
  box-sizing: border-box;
  width: min(1100px, 94vw);
  min-height: clamp(130px, 26vh, 260px);
  padding: clamp(20px, 4vw, 50px);
  border: 10px solid white;
  background-color: black;
  color: white;
  cursor: pointer;
  display: flex;
  gap: 0.6em;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1.2rem, 3.4vw, 3rem);
  font-weight: normal;
  line-height: 1.3;
`;

export default DialogBox;
