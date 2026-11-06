import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { NARROW_HUD } from "./hudCorner.js";
import { ChatIcon } from "./HudIcons.jsx";
import { isModalOpen } from "../Helpers/modal.js";
import { MAX_CHAT_LENGTH } from "../Multiplayer/chat.js";

// The lobby's chat, in the bottom left. On phones it folds away behind a small button, as the
// screen needs the room for the town.

const Panel = styled.div`
  position: absolute;
  left: 20px;
  bottom: 20px;
  /* Below the choices that pop up along the bottom, so they're never covered */
  z-index: 101;
  /* Narrow enough to leave the middle of the bottom free for those choices */
  width: clamp(200px, calc(50vw - 200px), 320px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: "Pixelify Sans", serif;

  @media ${NARROW_HUD} {
    display: ${({ $open }) => ($open ? "flex" : "none")};
    width: auto;
    right: 20px;
    max-width: 360px;
    bottom: 76px;
  }
`;

const Log = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px 12px;
  max-height: 180px;
  overflow-y: auto;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-size: 14px;
  line-height: 1.35;
  overflow-wrap: anywhere;

  &:empty {
    display: none;
  }

  @media ${NARROW_HUD} {
    max-height: 40vh;

    &:empty {
      display: block;
    }
  }
`;

const Line = styled.li`
  & + & {
    margin-top: 3px;
  }
`;

const Name = styled.span`
  font-weight: bold;
  color: ${({ $mine }) => ($mine ? "#ffe08a" : "#9fd8ff")};
`;

const Hint = styled.li`
  opacity: 0.75;
`;

const Form = styled.form`
  display: flex;
  gap: 6px;
`;

const Input = styled.input`
  ${chromeButton}
  flex: 1;
  min-width: 0;
  border-radius: 14px;
  padding: 9px 12px;
  font-size: 14px;
  color: #2c3140;
  outline: none;

  &:hover {
    animation: none;
  }

  &::placeholder {
    color: #8a90a0;
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.7;
  }

  /* Phones zoom in on inputs with smaller text */
  @media ${NARROW_HUD} {
    font-size: 16px;
  }
`;

const CloseButton = styled.button`
  ${chromeButton}
  position: relative;
  padding: 0 12px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;

  @media not all and ${NARROW_HUD} {
    display: none;
  }
`;

const Toggle = styled.button`
  ${chromeButton}
  position: absolute;
  left: 20px;
  bottom: 20px;
  z-index: 101;
  width: 46px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  @media not all and ${NARROW_HUD} {
    display: none;
  }

  ${({ $open }) =>
    $open &&
    css`
      opacity: 0.85;
    `}
`;

const Unread = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  z-index: 2;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2483d;
  box-shadow: 0 0 0 2px white;
`;

const narrow = () => window.matchMedia(NARROW_HUD).matches;

function placeholderFor(status, name) {
  if (status === "online") return name ? `Chat as ${name}…` : "Say something…";
  if (status === "full") return "Chat opens once you get a place";
  if (status === "offline") return "Chat is offline";
  return "Joining…";
}

const Chat = ({ room }) => {
  const { messages, status, name, say } = room;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const inputRef = useRef(null);
  const logRef = useRef(null);
  const online = status === "online";
  const latest = messages.length ? messages[messages.length - 1].key : 0;

  // Keeps the newest message in view
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [latest, open]);

  // While it's open on a phone, everything said counts as read
  useEffect(() => {
    if (open) setSeen(latest);
  }, [open, latest]);

  // Enter starts typing, like in most games, as long as it isn't pressing a focused button
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Enter" || event.repeat || isModalOpen()) return;
      const focused = document.activeElement;
      if (focused && focused !== document.body && focused.matches("button, a, input, textarea")) {
        return;
      }
      event.preventDefault();
      setOpen(true);
      // On a phone the panel has to show before it can take focus
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = () => {
    inputRef.current?.blur();
    setOpen(false);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) {
      // An empty Enter just steps back out to walking
      if (!narrow()) inputRef.current?.blur();
      return;
    }
    if (say(text)) {
      setText("");
      // Back to walking on a keyboard. On a phone the keyboard stays up for a reply.
      if (!narrow()) inputRef.current?.blur();
    }
  };

  const unread = !open && latest > seen && messages.some((m) => m.key > seen && !m.mine);

  return (
    <>
      <Panel
        $open={open}
        // Otherwise the game hears the typing and walks the character around, or emotes
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") close();
        }}
      >
        <Log ref={logRef} aria-live="polite" aria-label="Chat messages">
          {messages.map((message) => (
            <Line key={message.key}>
              <Name $mine={message.mine}>{message.mine ? "You" : message.from}:</Name>{" "}
              {message.text}
            </Line>
          ))}
          {messages.length === 0 && open && (
            <Hint>Only the people in this town can see what you say.</Hint>
          )}
        </Log>
        <Form onSubmit={submit}>
          <Input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MAX_CHAT_LENGTH}
            placeholder={placeholderFor(status, name)}
            disabled={!online}
            aria-label="Chat message"
            enterKeyHint="send"
            autoComplete="off"
          />
          <CloseButton type="button" onClick={close} aria-label="Close chat">
            ✕
            <ChromeFrame spikes={false} />
          </CloseButton>
        </Form>
      </Panel>
      <Toggle
        type="button"
        $open={open}
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        title="Chat"
      >
        <ChatIcon />
        {unread && <Unread aria-hidden="true" />}
        <ChromeFrame />
      </Toggle>
    </>
  );
};

export default Chat;
