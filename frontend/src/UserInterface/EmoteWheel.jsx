import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { EMOTES } from "../Game/emotes.js";

const SLOTS = 6;
const OUTER = 190;
const INNER = 100;
const CENTRE = 200;
const GAP_DEGREES = 1;
const ICON_RADIUS = (OUTER + INNER) / 2;
// The emotes are spaced evenly around the wheel, with empty slots between them
const SLOTS_PER_EMOTE = Math.floor(SLOTS / EMOTES.length);

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 104;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(10, 30, 60, 0.3);
  backdrop-filter: blur(3px);
  font-family: "Pixelify Sans", serif;
  color: white;
  user-select: none;

  &:focus {
    outline: none;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: clamp(1.6rem, 5vmin, 3rem);
  font-weight: bold;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.55);
`;

const Name = styled.p`
  margin: 0;
  min-height: 1.2em;
  font-size: clamp(1.8rem, 6vmin, 3.4rem);
  font-weight: bold;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.55);
`;

const Wheel = styled.svg`
  width: min(66vmin, 560px);
  height: min(66vmin, 560px);
  filter: drop-shadow(5px 7px 0 rgba(20, 50, 80, 0.6));
`;

const Slot = styled.path`
  fill: ${({ $selected }) => ($selected ? "#0a64f0" : "#2b2b2d")};
  stroke: rgba(120, 190, 225, 0.45);
  stroke-width: 1.5;
  cursor: ${({ $filled }) => ($filled ? "pointer" : "default")};
  transition: fill 80ms linear;
`;

// Each figure is thick round-ended lines plus a head, which reads as a silhouette at this size.
// Drawn on a grid from -30 to 30, facing the viewer.
const LEGS = "M0 6 L-7 28 M0 6 L7 28";
const FIGURES = {
  wave: {
    head: [-2, -18],
    lines: `M0 -11 L0 6 ${LEGS} M0 -9 L12 -4 L8 12 M0 -9 L-14 -12 L-12 -28`,
  },
  dab: {
    head: [5, -14],
    lines: `M0 -9 L0 6 ${LEGS} M0 -8 L-24 -20 M0 -8 L18 -4 L3 -18`,
  },
  floss: {
    head: [2, -19],
    lines: "M0 -12 L-4 6 M-4 6 L-1 28 M-4 6 L8 26 M0 -10 L18 2 M0 -10 L20 10",
  },
};

function pointOnWheel(radius, degrees) {
  const angle = THREE_QUARTER_TURN + (degrees * Math.PI) / 180;
  return [CENTRE + Math.cos(angle) * radius, CENTRE + Math.sin(angle) * radius];
}
const THREE_QUARTER_TURN = -Math.PI / 2;

function slotPath(slot) {
  const half = 180 / SLOTS - GAP_DEGREES;
  const middle = (slot * 360) / SLOTS;
  const [outerStartX, outerStartY] = pointOnWheel(OUTER, middle - half);
  const [outerEndX, outerEndY] = pointOnWheel(OUTER, middle + half);
  const [innerEndX, innerEndY] = pointOnWheel(INNER, middle + half);
  const [innerStartX, innerStartY] = pointOnWheel(INNER, middle - half);
  return [
    `M${outerStartX} ${outerStartY}`,
    `A${OUTER} ${OUTER} 0 0 1 ${outerEndX} ${outerEndY}`,
    `L${innerEndX} ${innerEndY}`,
    `A${INNER} ${INNER} 0 0 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ");
}

const emoteInSlot = (slot) =>
  slot % SLOTS_PER_EMOTE === 0 ? EMOTES[slot / SLOTS_PER_EMOTE] ?? null : null;

const EmoteWheel = ({ onPick, onClose }) => {
  const overlayRef = useRef(null);
  const wheelRef = useRef(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    overlayRef.current.focus();
  }, []);

  // Like the game's wheel, the direction of the mouse from the middle is what picks a slot
  const onPointerMove = (event) => {
    const box = wheelRef.current.getBoundingClientRect();
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    if (Math.hypot(x, y) < (box.width / 400) * INNER * 0.5) return;
    const degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const slot = Math.round(degrees / (360 / SLOTS));
    const emoteIndex = EMOTES.indexOf(emoteInSlot((slot + SLOTS) % SLOTS));
    if (emoteIndex !== -1) setSelected(emoteIndex);
  };

  const onKeyDown = (event) => {
    const count = EMOTES.length;
    const actions = {
      ArrowRight: () => setSelected((current) => (current + 1) % count),
      ArrowDown: () => setSelected((current) => (current + 1) % count),
      ArrowLeft: () => setSelected((current) => (current - 1 + count) % count),
      ArrowUp: () => setSelected((current) => (current - 1 + count) % count),
      Enter: () => onPick(EMOTES[selected]),
      " ": () => onPick(EMOTES[selected]),
      Escape: onClose,
    };
    const action = actions[event.key];
    if (!action) return;
    // Stopping these here keeps the arrow keys from also walking the character
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  const slots = Array.from({ length: SLOTS }, (_, slot) => slot);

  return (
    <Overlay
      ref={overlayRef}
      id="emote_wheel"
      role="listbox"
      aria-label="Emotes"
      tabIndex={0}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      onClick={onClose}
    >
      <Title>EMOTES</Title>
      <Wheel ref={wheelRef} viewBox="0 0 400 400">
        {slots.map((slot) => {
          const emote = emoteInSlot(slot);
          const isSelected = emote !== null && emote === EMOTES[selected];
          const pick = (event) => {
            event.stopPropagation();
            if (emote) onPick(emote);
          };
          return (
            <Slot
              key={slot}
              d={slotPath(slot)}
              $filled={emote !== null}
              $selected={isSelected}
              data-emote={emote?.id}
              role={emote ? "option" : undefined}
              aria-selected={emote ? isSelected : undefined}
              aria-label={emote?.label}
              onClick={pick}
            />
          );
        })}
        {EMOTES.map((emote, index) => {
          const [x, y] = pointOnWheel(ICON_RADIUS, (index * SLOTS_PER_EMOTE * 360) / SLOTS);
          const { head, lines } = FIGURES[emote.id];
          const colour = index === selected ? "#ffffff" : "#a8a8ac";
          return (
            <g
              key={emote.id}
              transform={`translate(${x} ${y}) scale(1.45)`}
              pointerEvents="none"
              aria-hidden="true"
            >
              <circle cx={head[0]} cy={head[1]} r={6.5} fill={colour} />
              <path
                d={lines}
                fill="none"
                stroke={colour}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
      </Wheel>
      <Name>{EMOTES[selected].label}</Name>
    </Overlay>
  );
};

export default EmoteWheel;
