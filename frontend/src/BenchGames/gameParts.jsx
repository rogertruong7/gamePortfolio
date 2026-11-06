import styled from "styled-components";
import ChromeFrame, { chromeButton } from "../UserInterface/ChromeFrame.jsx";
import { ink, inkSoft, pixel } from "../UserInterface/Modal.jsx";

// Pixelify Sans draws "fi" as one glyph that reads like "A", so ligatures are off
export const Status = styled.p`
  margin: 0 0 18px;
  font-variant-ligatures: none;
  text-align: center;
  font: 600 24px / 1.2 ${pixel};
  color: ${ink};
`;

export const Score = styled.p`
  margin: 0 0 6px;
  font-variant-ligatures: none;
  text-align: center;
  font: 600 20px / 1.2 ${pixel};
  color: ${inkSoft};
`;

export const GameButton = styled.button`
  ${chromeButton}
  position: relative;
  padding: 12px 22px;
  color: ${ink};
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 20px;
  margin-top: 22px;
  color: ${inkSoft};
`;

// Shown once a game is over. Both have to ask for the rematch before it starts.
export const AgainBar = ({ partnerName, again, onAgain }) => (
  <Bar>
    {again.them && !again.me && <span>{partnerName} wants a rematch.</span>}
    {again.me && <span>Waiting for {partnerName}…</span>}
    <GameButton type="button" onClick={onAgain} disabled={again.me}>
      Play again
      <ChromeFrame spikes={false} />
    </GameButton>
  </Bar>
);
