import styled from "styled-components";
import ChromeFrame, { chromeButton } from "../../UserInterface/ChromeFrame.jsx";
import { ink, inkSoft, pixel } from "../../UserInterface/Modal.jsx";

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

// The list of games to pick from. games are { id, name, blurb }, and onPick hears the id.
export const GamePicker = ({ games, onPick }) => (
  <Options>
    {games.map((game) => (
      <Option key={game.id} type="button" onClick={() => onPick(game.id)}>
        <OptionName>{game.name}</OptionName>
        <OptionBlurb>{game.blurb}</OptionBlurb>
        <ChromeFrame spikes={false} />
      </Option>
    ))}
  </Options>
);

// Two across where there's room, as there are a good few games to pick from
const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
`;

const Option = styled.button`
  ${chromeButton}
  position: relative;
  display: block;
  width: 100%;
  padding: 12px 18px;
  text-align: left;
  color: ${ink};
  cursor: pointer;
`;

const OptionName = styled.span`
  display: block;
  font: 600 21px / 1.2 ${pixel};
`;

const OptionBlurb = styled.span`
  display: block;
  margin-top: 4px;
  color: ${inkSoft};
  font-size: 14px;
  font-family: "Zen Kaku Gothic New", system-ui, sans-serif;
`;
