import styled from "styled-components";
import ChromeFrame from "../UserInterface/ChromeFrame.jsx";
import { body, focusBlue, ink, inkSoft } from "../UserInterface/Modal.jsx";
import { GameButton } from "../BenchGames/shared/gameParts.jsx";

// What the arcade games share on screen: the canvas, the touch buttons and the bar at the end.

// As wide as fits, but never so tall that it pushes the buttons off a phone's screen. $ratio is
// width over height and $room how much of the screen's height the rest of the popup needs.
export const ArcadeCanvas = styled.canvas`
  display: block;
  width: min(
    100%,
    ${({ $most }) => $most}px,
    calc((100dvh - ${({ $room }) => $room}px) * ${({ $ratio }) => $ratio})
  );
  aspect-ratio: ${({ $ratio }) => $ratio};
  margin: 0 auto;
  border-radius: 12px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 3px;
  }
`;

export const KeyHint = styled.p`
  max-width: 520px;
  margin: 12px auto 0;
  text-align: center;
  color: ${inkSoft};
  font-size: 15px;
`;

const Pad = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
  user-select: none;
  -webkit-user-select: none;
`;

const PadButton = styled(GameButton)`
  min-width: 64px;
  padding: 12px 14px;
  touch-action: none;
`;

// Touch buttons that act while held. buttons are { label, name, press, release }. They don't take
// focus, so the keys keep going to the game.
export const TouchPad = ({ buttons }) => (
  <Pad>
    {buttons.map(({ label, name, press, release }) => (
      <PadButton
        key={name}
        type="button"
        tabIndex={-1}
        aria-label={name}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          press();
        }}
        // Keeps the focus where it was, on the game
        onMouseDown={(event) => event.preventDefault()}
        onPointerUp={() => release?.()}
        onPointerCancel={() => release?.()}
        onContextMenu={(event) => event.preventDefault()}
      >
        {label}
        <ChromeFrame spikes={false} />
      </PadButton>
    ))}
  </Pad>
);

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 20px;
  margin-top: 16px;
`;

const Note = styled.span`
  color: ${inkSoft};
`;

// The arcade's text is in the same type as the project pages, which reads more easily than the
// pixel font at these sizes
const Score = styled.p`
  margin: 0 0 8px;
  text-align: center;
  font: 700 18px / 1.3 ${body};
  font-variant-numeric: tabular-nums;
  color: ${inkSoft};
`;

export const ArcadeStatus = styled.p`
  margin: 0 0 14px;
  text-align: center;
  font: 700 24px / 1.25 ${body};
  color: ${ink};
`;

// The line above the game: the score so far and the best on this browser
export const ScoreLine = ({ score, best, extra }) => (
  <Score>
    Score {score} · Best {Math.max(best, score)}
    {extra ? ` · ${extra}` : ""}
  </Score>
);

// Under the game once it's over, or while it's paused
export const EndBar = ({ note, label = "Play again", onPress }) => (
  <Bar>
    {note && <Note>{note}</Note>}
    <GameButton type="button" onClick={onPress}>
      {label}
      <ChromeFrame spikes={false} />
    </GameButton>
  </Bar>
);

const RestartLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 520px;
  margin: 12px auto 0;
  color: ${inkSoft};
  font-size: 15px;
`;

const RestartTrack = styled.div`
  width: 120px;
  height: 8px;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(20, 35, 90, 0.15);
`;

const RestartFill = styled.div`
  height: 100%;
  background: ${focusBlue};
`;

// Shown in place of the key hint while R is held, filling up until the game starts again
export const RestartBar = ({ progress }) => (
  <RestartLine role="status">
    Keep holding R to start again
    <RestartTrack>
      {/* Changes every frame, which would make a new class each time as a styled prop */}
      <RestartFill style={{ width: `${Math.round(progress * 100)}%` }} />
    </RestartTrack>
  </RestartLine>
);
