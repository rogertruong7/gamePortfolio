import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { NARROW_HUD, topLeftSlot } from "./hudCorner.js";
import { ShirtIcon } from "./HudIcons.jsx";

// Sits on top of the stack of buttons in the bottom right: wardrobe, help, emote, reset
const Button = styled.button`
  ${chromeButton}
  position: absolute;
  bottom: 206px;
  right: 20px;
  z-index: 103;
  width: 80px;
  margin: 0 5px;
  padding: 7px 15px 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  ${topLeftSlot(3, false)}

  /* Just the icon in the top row on phones, so the row clears the menu button */
  @media ${NARROW_HUD} {
    width: 46px;
    padding: 8px 6px 6px;
  }
`;

const WardrobeButton = ({ onOpen }) => (
  <Button type="button" onClick={onOpen} aria-label="Wardrobe" title="Wardrobe">
    <ShirtIcon />
    <ChromeFrame />
  </Button>
);

export default WardrobeButton;
