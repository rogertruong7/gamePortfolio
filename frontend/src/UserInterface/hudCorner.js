import { css } from "styled-components";

// On narrow screens the buttons along the bottom right would cover the choices that pop up
// there, so they move up into a row along the top left instead
export const NARROW_HUD = "(max-width: 820px)";
// Where each button starts in that row, past the home button when it's showing
const HOME_WIDTH = 84;
const BUTTON_WIDTH = 76;

export const topLeftSlot = (slot, afterHome) => css`
  @media ${NARROW_HUD} {
    top: 20px;
    bottom: auto;
    right: auto;
    left: ${20 + (afterHome ? HOME_WIDTH : 0) + slot * BUTTON_WIDTH}px;
    width: ${BUTTON_WIDTH - 10}px;
    padding: 10px 6px;
  }
`;
