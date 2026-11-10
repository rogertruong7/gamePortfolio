import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { NARROW_HUD } from "./hudCorner.js";
import { ChevronIcon, PeopleIcon } from "./HudIcons.jsx";
import { ROOM_SIZE } from "../Multiplayer/room.js";

const LIVE = "#2fae5f";
const WAITING = "#d9a400";
const DOWN = "#9aa1ad";

// How many people are in the town. It sits in the top left corner, except on phones, where the
// HUD buttons are up there and it goes in the menu instead. Once in the town, it opens a list of
// who's here, with a button by each of the others to ask them to play a game.
const Wrapper = styled.div`
  ${({ $where }) =>
    $where === "corner"
      ? css`
          position: absolute;
          top: 20px;
          left: 25px;
          z-index: 103;

          @media ${NARROW_HUD} {
            display: none;
          }
        `
      : css`
          position: relative;
          margin: 0 5px;

          @media not all and ${NARROW_HUD} {
            display: none;
          }
        `}
`;

const Pill = styled.button`
  ${chromeButton}
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 12px;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};

  &:disabled {
    color: #4a4f5c;
  }

  &:hover {
    animation: ${({ disabled }) => (disabled ? "none" : "")};
  }
`;

const List = styled.ul`
  ${chromeButton}
  position: absolute;
  top: calc(100% + 10px);
  ${({ $where }) => ($where === "corner" ? "left: 0;" : "right: 0;")}
  z-index: 1;
  min-width: 220px;
  max-height: 60vh;
  overflow-y: auto;
  margin: 0;
  padding: 8px;
  list-style: none;
  font-size: 14px;

  &:hover {
    animation: none;
  }
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 8px;

  & + & {
    border-top: 1px solid #dde2ea;
  }
`;

const Name = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Zen Kaku Gothic New", system-ui, sans-serif;
  font-weight: 700;
`;

const You = styled.span`
  margin-left: 6px;
  font-weight: 400;
  opacity: 0.7;
`;

const PlayButton = styled.button`
  ${chromeButton}
  position: relative;
  flex: none;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $colour }) => $colour};
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
`;

function describe({ status, count, lobby }) {
  if (status === "online") {
    // The first town is just "the town". Past that, it says which one, as the others can't be seen.
    const where = lobby > 1 ? ` · room ${lobby}` : "";
    return {
      colour: LIVE,
      text: `${count}/${ROOM_SIZE} here${where}`,
      title:
        lobby > 1
          ? `The first towns were full, so you're in room ${lobby}, with ${count} of up to ${ROOM_SIZE} people`
          : `${count} of up to ${ROOM_SIZE} people walking around the town`,
    };
  }
  if (status === "full") {
    return {
      colour: WAITING,
      text: "all full",
      title: "Every room is full. You'll join one when someone leaves.",
    };
  }
  if (status === "offline") {
    return { colour: DOWN, text: "offline", title: "Couldn't reach the other visitors" };
  }
  return { colour: DOWN, text: "joining…", title: "Joining the town" };
}

// onPlay hears { id, name } of whoever this player wants to play a game with
const PlayerCount = ({ room, where = "corner", onPlay }) => {
  const { colour, text, title } = describe(room);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const canOpen = room.status === "online";
  const showing = open && canOpen;

  // Closes on a click anywhere else, or Escape
  useEffect(() => {
    if (!showing) return undefined;
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showing]);

  const others = [...room.peers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Wrapper ref={wrapperRef} $where={where}>
      <Pill
        type="button"
        title={title}
        aria-label={`${title}. ${showing ? "Hide" : "Show"} who's here`}
        aria-expanded={showing}
        disabled={!canOpen}
        onClick={() => setOpen((current) => !current)}
      >
        <PeopleIcon />
        <span role="status">{text}</span>
        <Dot $colour={colour} />
        {canOpen && <ChevronIcon open={showing} />}
        <ChromeFrame spikes={false} />
      </Pill>
      {showing && (
        <List $where={where} aria-label="Who's here">
          <Row>
            <Name>
              {room.name}
              <You>(you)</You>
            </Name>
          </Row>
          {others.map((player) => (
            <Row key={player.id}>
              <Name title={player.name}>{player.name}</Name>
              {onPlay && (
                <PlayButton
                  type="button"
                  aria-label={`Ask ${player.name} to play a game`}
                  onClick={() => {
                    setOpen(false);
                    onPlay({ id: player.id, name: player.name });
                  }}
                >
                  Play
                  <ChromeFrame spikes={false} />
                </PlayButton>
              )}
            </Row>
          ))}
        </List>
      )}
    </Wrapper>
  );
};

export default PlayerCount;
