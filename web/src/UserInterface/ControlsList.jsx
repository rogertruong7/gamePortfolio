import { useState } from "react";
import styled from "styled-components";
import ChromeFrame from "./ChromeFrame.jsx";
import { PHONE, crimson, ink, inkSoft, pixel } from "./Modal.jsx";

// The pieces the tutorial and the help popup build their lists of controls from.

// The game only listens for a mouse and keyboard, and a tap arrives as a click, so phones get
// told about the one input that works for them.
export const useTouchOnly = () => {
  const [touchOnly] = useState(
    () => window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
  return touchOnly;
};

export const Key = ({ children }) => (
  <KeyCap>
    {children}
    <ChromeFrame spikes={false} radius={10} />
  </KeyCap>
);

// A long key, like the space bar
export const WideKey = ({ children }) => (
  <KeyCap $wide>
    {children}
    <ChromeFrame spikes={false} radius={10} />
  </KeyCap>
);

// A rounded label for something on screen or a gesture, like "tap" or "emote"
export const Chip = ({ children, round = false }) => (
  <ChipShape>
    {children}
    {round ? <ChromeFrame spikes={false} radius={14} /> : <ChromeFrame />}
  </ChipShape>
);

const Arrow = ({ turn }) => (
  <svg
    viewBox="0 0 9 9"
    width="18"
    height="18"
    shapeRendering="crispEdges"
    aria-hidden="true"
    style={{ transform: `rotate(${turn}deg)` }}
  >
    <path fill="currentColor" d="M4 0h1v1h1v1h1v1h1v1H6v5H3V4H1V3h1V2h1V1h1z" />
  </svg>
);

// A pixel mouse with its left button lit up.
export const MouseIcon = () => (
  <svg viewBox="0 0 10 14" width="15" height="21" shapeRendering="crispEdges" aria-hidden="true">
    <path fill={ink} d="M2 0h6v1h1v1h1v10H9v1H8v1H2v-1H1v-1H0V2h1V1h1z" />
    <path fill="#fff" d="M5 2h2v1h1v3H5zM2 7h6v5H7v1H3v-1H2z" />
    <path fill={crimson} d="M3 1h1v5H2V3h1z" />
  </svg>
);

export const WalkKeys = () => (
  <Clusters>
    <Cluster role="img" aria-label="W, A, S, D keys">
      <Key>W</Key>
      <Key>A</Key>
      <Key>S</Key>
      <Key>D</Key>
    </Cluster>
    <Or>or</Or>
    <Cluster role="img" aria-label="Arrow keys">
      <Key>
        <Arrow turn={0} />
      </Key>
      <Key>
        <Arrow turn={-90} />
      </Key>
      <Key>
        <Arrow turn={180} />
      </Key>
      <Key>
        <Arrow turn={90} />
      </Key>
    </Cluster>
  </Clusters>
);

export const Row = ({ input, title, children }) => (
  <RowItem>
    <Input>{input}</Input>
    <Action>
      {title && <strong>{title}</strong>}
      {children && <span>{children}</span>}
    </Action>
  </RowItem>
);

// Just enough to get going: walking and the camera. The help popup has the rest.
export const EssentialControls = () => {
  const touchOnly = useTouchOnly();

  if (touchOnly) {
    return (
      <List>
        <Row input={<Chip round>tap</Chip>} title="Walk">
          Tap where you want to go.
        </Row>
        <Row input={<Chip round>camera</Chip>} title="Camera">
          It follows you as you walk.
        </Row>
      </List>
    );
  }

  return (
    <List>
      <Row input={<WalkKeys />} title="Walk">
        Or click where you want to go.
      </Row>
      <Row
        input={
          <Chip round>
            <MouseIcon />
            hold and drag
          </Chip>
        }
        title="Camera"
      >
        Hold the mouse button and drag to look around.
      </Row>
    </List>
  );
};

export const List = styled.ul`
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media ${PHONE} {
    gap: 14px;
  }
`;

const RowItem = styled.li`
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  align-items: center;
  gap: 8px 20px;

  @container (max-width: 460px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
`;

const Input = styled.div`
  display: flex;
  align-items: center;
  /* Room for the frame's spikes inside the scrolling area. */
  padding: 2px 12px 2px 4px;
`;

const Action = styled.div`
  line-height: 1.4;

  strong {
    display: block;
    font-weight: 700;
  }

  span {
    display: block;
    color: ${inkSoft};
  }
`;

const Clusters = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Or = styled.span`
  color: ${inkSoft};
  font-weight: 500;
`;

// W on top of A S D, like the keys sit on a keyboard.
const Cluster = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 32px);
  grid-auto-rows: 32px;
  gap: 5px;

  & > :first-child {
    grid-column: 2;
  }

  & > :nth-child(2) {
    grid-column: 1;
  }
`;

const KeyCap = styled.span`
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(#fff, #e6eaf1);
  color: ${ink};
  font: 700 17px / 1 ${pixel};
  ${({ $wide }) => ($wide ? "width: 120px; height: 32px;" : "min-width: 32px; height: 32px; padding: 0 8px;")}

  @media ${PHONE} {
    font-size: 15px;
  }
`;

const ChipShape = styled.span`
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 6px 15px;
  border-radius: 14px;
  background: linear-gradient(#fff, #e6eaf1);
  color: ${ink};
  /* Above 500, Pixelify closes up its "c" and "click" reads as "olick". */
  font: 500 17px / 1 ${pixel};
  white-space: nowrap;

  @media ${PHONE} {
    min-height: 34px;
    padding: 5px 12px;
    font-size: 15px;
  }
`;
