import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { EMOTES } from "../Game/emotes.js";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import { body, ink, pixel } from "./Modal.jsx";

const SLOTS = 6;
const OUTER = 192;
const INNER = 92;
const CENTRE = 200;
const GAP_DEGREES = 1;
const ICON_RADIUS = (OUTER + INNER) / 2;
// The emotes are spaced evenly around the wheel, with empty slots between them
const SLOTS_PER_EMOTE = Math.floor(SLOTS / EMOTES.length);

// Styled like the help popup: the same dark blue backdrop, a chrome frame, pale paper and the
// loading bar's blue gel for whatever's picked
const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 104;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 3vmin, 24px);
  background: rgba(11, 22, 64, 0.62);
  font-family: ${pixel};
  user-select: none;

  &:focus {
    outline: none;
  }
`;

const Label = styled.h2`
  ${chromeButton}
  position: relative;
  margin: 0;
  padding: 8px 26px;
  color: ${ink};
  font-size: clamp(1.1rem, 3vmin, 1.5rem);
  font-weight: 600;
  pointer-events: none;
`;

const WheelFrame = styled.div`
  position: relative;
  isolation: isolate;
  width: min(66vmin, 520px);
  height: min(66vmin, 520px);
  border-radius: 50%;
`;

const Wheel = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
`;

const Slot = styled.path`
  fill: ${({ $selected, $filled }) =>
    $selected ? "url(#emote_gel)" : $filled ? "#f7fbfd" : "#dfeaf3"};
  stroke: rgba(20, 35, 90, 0.18);
  stroke-width: 1.5;
  cursor: ${({ $filled }) => ($filled ? "pointer" : "default")};
`;

// The picked emote's name, in the hole in the middle of the wheel
const Hub = styled.p`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: ${ink};
  font-size: clamp(1.1rem, 4vmin, 2rem);
  font-weight: 600;
  pointer-events: none;
`;

const Hint = styled.p`
  margin: 0;
  color: #dbe9f6;
  font: 500 clamp(0.8rem, 2.2vmin, 1rem) / 1.4 ${body};
  text-align: center;
  pointer-events: none;

  kbd {
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(247, 251, 253, 0.16);
    font: inherit;
  }
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
  // Both arms swung to one side: one out with its fist hanging down, the other across the front
  floss: {
    head: [0, -20],
    lines: "M0 -13 L0 5 M0 5 L-7 28 M0 5 L7 28 M0 -10 L15 -9 L19 1 M0 -10 L-5 -2 L10 4",
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

// Little four-pointed stars on the rim, like the ones on the chrome frames
const SPARKLE_SPOTS = [0, 90, 180, 270].map((degrees) => pointOnWheel(OUTER + 3, degrees));
function sparkle(x, y, size = 11) {
  // Each side curves in towards the middle, which pinches the points
  return [
    `M${x} ${y - size}`,
    `Q${x} ${y} ${x + size} ${y}`,
    `Q${x} ${y} ${x} ${y + size}`,
    `Q${x} ${y} ${x - size} ${y}`,
    `Q${x} ${y} ${x} ${y - size}`,
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
      <Label>
        emotes
        <ChromeFrame spikes={false} />
      </Label>
      <WheelFrame>
        <Wheel ref={wheelRef} viewBox="0 0 400 400">
          <defs>
            <linearGradient id="emote_gel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="22%" stopColor="#d6f2ff" />
              <stop offset="48%" stopColor="#6cc4f5" />
              <stop offset="56%" stopColor="#1f7fd6" />
              <stop offset="100%" stopColor="#4fb4f0" />
            </linearGradient>
            <linearGradient id="emote_chrome" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#bcc4d2" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#8d96a8" />
              <stop offset="100%" stopColor="#eef1f6" />
            </linearGradient>
          </defs>
          <circle
            cx={CENTRE}
            cy={CENTRE}
            r={OUTER + 3}
            fill="#f7fbfd"
            stroke="url(#emote_chrome)"
            strokeWidth={6}
          />
          <circle cx={CENTRE} cy={CENTRE} r={INNER - 6} fill="#86cdeb" />
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
            const colour = index === selected ? "#ffffff" : ink;
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
          {SPARKLE_SPOTS.map(([x, y]) => (
            <path
              key={`${x}-${y}`}
              d={sparkle(x, y)}
              fill="url(#emote_chrome)"
              stroke="#8d96a8"
              strokeWidth={0.75}
            />
          ))}
        </Wheel>
        <Hub>{EMOTES[selected].label}</Hub>
      </WheelFrame>
      <Hint>
        Pick with the mouse or <kbd>arrows</kbd> and <kbd>Enter</kbd>. <kbd>Esc</kbd> closes.
      </Hint>
    </Overlay>
  );
};

export default EmoteWheel;
