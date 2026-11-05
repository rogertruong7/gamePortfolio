import { useEffect, useState } from "react";
import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import EmoteWheel from "./EmoteWheel.jsx";
import { isModalOpen } from "../Helpers/modal.js";

const Button = styled.button`
  ${chromeButton}
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  position: absolute;
  bottom: 82px;
  right: 20px;
  z-index: 103;
  width: 80px;
`;

const EmoteButton = ({ onEmote }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== "b" || event.repeat || isModalOpen()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      setOpen((isOpen) => !isOpen);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pick = (emote) => {
    setOpen(false);
    onEmote(emote);
  };

  return (
    <>
      <Button id="emote_button" aria-expanded={open} onClick={() => setOpen(true)}>
        emote
        <ChromeFrame />
      </Button>
      {open && <EmoteWheel onPick={pick} onClose={() => setOpen(false)} />}
    </>
  );
};

export default EmoteButton;
