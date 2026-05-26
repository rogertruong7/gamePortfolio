import styled from "styled-components";
import { useAudio } from "../Audio/AudioContext.jsx";

const Button = styled.button`
  background-color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  padding: 0;
  color: #666;

  &:hover {
    background-color: #f0f0f0;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SpeakerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const MutedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const MuteButton = () => {
  const { muted, setMuted } = useAudio();

  return (
    <Button onClick={() => setMuted(!muted)} title={muted ? "Unmute" : "Mute"}>
      {muted ? <MutedIcon /> : <SpeakerIcon />}
    </Button>
  );
};

export default MuteButton;
