import { useState } from "react";
import styled from "styled-components";
import { useAudio } from "../Audio/AudioContext.jsx";
import { writeStore } from "../Helpers/storage.js";
import ChromeFrame from "./ChromeFrame.jsx";
import ControlsList from "./ControlsList.jsx";
import { ShirtIcon } from "./HudIcons.jsx";
import Modal, { crimson, focusBlue, ink, inkSoft } from "./Modal.jsx";

// onCustomise opens the wardrobe, for anyone who wants to make the character theirs first
const Popup = ({ setShowPopup, onCustomise }) => {
  const { setMuted, setAudioReady } = useAudio();
  const [startMuted, setStartMuted] = useState(false);

  const handleClose = () => {
    writeStore("visited", "true");
    if (startMuted) {
      setMuted(true);
    }
    setAudioReady(true);
    setShowPopup(false);
  };

  const customise = () => {
    handleClose();
    onCustomise();
  };

  return (
    <Modal
      title="Hi, I'm Roger"
      tagline="Welcome to my portfolio. Walk around the town and go into any building you like. I made the original codebase before agents like Claude Code."
      actionLabel="Start exploring"
      onClose={handleClose}
      secondaryAction={{
        label: (
          <>
            <ShirtIcon size={18} />
            Customise character
          </>
        ),
        onClick: customise,
      }}
      footer={
        <MuteLabel>
          <Box>
            <input
              type="checkbox"
              checked={startMuted}
              onChange={(e) => setStartMuted(e.target.checked)}
            />
            <svg
              viewBox="0 0 9 8"
              width="18"
              height="16"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              <path
                fill={crimson}
                d="M7 0h2v2H8v1H7v1H6v1H5v1H4v1H3V6H2V5H1V4H0V3h2v1h1v1h1V4h1V3h1V2h1z"
              />
            </svg>
            <ChromeFrame spikes={false} radius={8} />
          </Box>
          <span>
            <strong>Start muted</strong>
            <small>This site has music and sound effects.</small>
          </span>
        </MuteLabel>
      }
    >
      <ControlsList />
    </Modal>
  );
};

const MuteLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  user-select: none;

  strong {
    display: block;
    color: ${ink};
    font-size: 16px;
    font-weight: 700;
  }

  small {
    display: block;
    color: ${inkSoft};
    font-size: 14px;
  }
`;

const Box = styled.span`
  position: relative;
  isolation: isolate;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: 2px;
  border-radius: 8px;
  background: linear-gradient(#fff, #e6eaf1);

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  svg {
    visibility: hidden;
  }

  input:checked + svg {
    visibility: visible;
  }

  &:has(input:focus-visible) {
    outline: 3px solid ${focusBlue};
    outline-offset: 5px;
  }
`;

export default Popup;
