import styled, { css } from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { NARROW_HUD } from "./hudCorner.js";
import { PeopleIcon } from "./HudIcons.jsx";
import { ROOM_SIZE } from "../Multiplayer/room.js";

const LIVE = "#2fae5f";
const WAITING = "#d9a400";
const DOWN = "#9aa1ad";

// How many people are in the town. It sits in the top left corner, except on phones, where the
// HUD buttons are up there and it goes in the menu instead.
const Pill = styled.div`
  ${chromeButton}
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 12px;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  cursor: default;

  &:hover {
    animation: none;
  }

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
          margin: 0 5px;

          @media not all and ${NARROW_HUD} {
            display: none;
          }
        `}
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

const PlayerCount = ({ room, where = "corner" }) => {
  const { colour, text, title } = describe(room);
  return (
    <Pill $where={where} title={title} role="status" aria-label={title}>
      <PeopleIcon />
      <span>{text}</span>
      <Dot $colour={colour} />
      <ChromeFrame spikes={false} />
    </Pill>
  );
};

export default PlayerCount;
