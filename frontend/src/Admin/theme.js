import styled, { css } from "styled-components";

export const color = {
  night: "#191c33",
  dusk: "#242848",
  duskLine: "#3b4070",
  lantern: "#fad998",
  ink: "#f6f1e4",
  mist: "#b3b7d4",
};

export const focusRing = css`
  &:focus-visible {
    outline: 3px solid ${color.lantern};
    outline-offset: 2px;
  }
`;

// The stepped corner is the same pixel dialogue box the game's pages use.
export const DialogueBox = styled.section`
  background-color: ${color.dusk};
  padding: 20px 24px;
  box-shadow:
    -4px 0 0 0 ${color.ink},
    4px 0 0 0 ${color.ink},
    0 -4px 0 0 ${color.ink},
    0 4px 0 0 ${color.ink};
`;

export const Panel = styled.section`
  min-width: 0;
`;

export const PanelTitle = styled.h2`
  font-family: "Pixelify Sans", serif;
  font-weight: 500;
  font-size: 1.35rem;
  margin: 0 0 12px;
  color: ${color.ink};
`;

export const Quiet = styled.p`
  margin: 0;
  color: ${color.mist};
  font-size: 0.875rem;
`;

export const PixelButton = styled.button`
  font-family: "Pixelify Sans", serif;
  font-size: 1rem;
  color: ${({ $active }) => ($active ? color.night : color.ink)};
  background-color: ${({ $active }) => ($active ? color.lantern : "transparent")};
  border: 2px solid ${({ $active }) => ($active ? color.lantern : color.duskLine)};
  padding: 6px 12px;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${color.lantern};
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  ${focusRing}
`;

export const TextField = styled.input`
  font-family: "Open Sans", sans-serif;
  font-size: 1rem;
  color: ${color.ink};
  background-color: ${color.night};
  border: 2px solid ${color.duskLine};
  padding: 8px 10px;
  min-width: 0;

  &:focus-visible {
    outline: none;
    border-color: ${color.lantern};
  }
`;
