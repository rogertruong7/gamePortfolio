import { useState } from "react";
import styled from "styled-components";
import ChromeFrame from "./ChromeFrame.jsx";
import { crimson, ink, inkSoft, pixel } from "./Modal.jsx";

const Key = ({ children }) => (
  <KeyCap>
    {children}
    <ChromeFrame spikes={false} radius={10} />
  </KeyCap>
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
    <path
      fill="currentColor"
      d="M4 0h1v1h1v1h1v1h1v1H6v5H3V4H1V3h1V2h1V1h1z"
    />
  </svg>
);

// A pixel mouse with its left button lit up.
const MouseIcon = () => (
  <svg
    viewBox="0 0 10 14"
    width="15"
    height="21"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    <path fill={ink} d="M2 0h6v1h1v1h1v10H9v1H8v1H2v-1H1v-1H0V2h1V1h1z" />
    <path fill="#fff" d="M5 2h2v1h1v3H5zM2 7h6v5H7v1H3v-1H2z" />
    <path fill={crimson} d="M3 1h1v5H2V3h1z" />
  </svg>
);

const WalkKeys = () => (
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

const Row = ({ input, children }) => (
  <RowItem>
    <Input>{input}</Input>
    <Action>{children}</Action>
  </RowItem>
);

// The game only listens for a mouse and keyboard, and a tap arrives as a click,
// so phones get the one input that works for them.
const ControlsList = ({ showReset = false }) => {
  const [touchOnly] = useState(
    () => window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );

  return (
    <List>
      {touchOnly ? (
        <Row
          input={
            <Chip>
              tap
              <ChromeFrame spikes={false} radius={14} />
            </Chip>
          }
        >
          Walk to that spot
        </Row>
      ) : (
        <>
          <Row input={<WalkKeys />}>Walk around</Row>
          <Row
            input={
              <Chip>
                <MouseIcon />
                click
                <ChromeFrame spikes={false} radius={14} />
              </Chip>
            }
          >
            Walk to that spot
          </Row>
          <Row
            input={
              <Chip>
                <MouseIcon />
                hold and drag
                <ChromeFrame spikes={false} radius={14} />
              </Chip>
            }
          >
            Move the camera
          </Row>
        </>
      )}
      <Row
        input={
          <Chip>
            Enter
            <ChromeFrame />
          </Chip>
        }
      >
        Go inside. This button appears when you reach a building.
      </Row>
      {showReset && (
        <Row
          input={
            <Chip>
              reset
              <ChromeFrame />
            </Chip>
          }
        >
          Go back to where you started
        </Row>
      )}
    </List>
  );
};

const List = styled.ul`
  display: grid;
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const RowItem = styled.li`
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  align-items: center;
  gap: 8px 20px;

  @container (max-width: 460px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
`;

const Input = styled.div`
  display: flex;
  align-items: center;
  /* Room for the frame's spikes inside the scrolling area. */
  padding: 2px 12px 2px 4px;
`;

const Action = styled.div`
  font-weight: 700;
  line-height: 1.4;
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
`;

const Chip = styled.span`
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
`;

export default ControlsList;
