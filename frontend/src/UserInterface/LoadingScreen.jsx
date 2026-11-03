import { useRef } from "react";
import styled from "styled-components";
import { useProgress } from "@react-three/drei";
import ChromeFrame from "./ChromeFrame.jsx";

const SEGMENTS = 20;
// The same diagonal sky as the game (Game/Backdrop.jsx), as a plain gradient so loading stays light.
const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 clamp(24px, 8vw, 120px);
  background: linear-gradient(135deg, #ffffff 0%, #a9dcf7 14%, #3f8fd6 50%, #a9dcf7 86%, #ffffff 100%);
  color: #0b1640;
  font-family: "Pixelify Sans", sans-serif;
`;

// Sets the bar's width; the label hangs above it so the bar itself sits dead centre.
const Centre = styled.div`
  position: relative;
  width: min(680px, 100%);
`;

const Status = styled.p`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 14px;
  font-size: clamp(18px, 2.4vw, 28px);
  font-weight: 600;
`;

const Bar = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  gap: 3px;
  box-sizing: border-box;
  width: 100%;
  height: 54px;
  padding: 9px 13px;
  border-radius: 20px;
  background: linear-gradient(#0b0d14, #262b38);
`;

// A glossy gel block, lit once loading passes it
const Segment = styled.span`
  flex: 1 1 0;
  min-width: 0;
  border-radius: 3px;
  background: ${({ $lit }) =>
    $lit
      ? "linear-gradient(#ffffff 0%, #d6f2ff 22%, #6cc4f5 48%, #1f7fd6 56%, #4fb4f0 100%)"
      : "rgba(169, 208, 240, 0.12)"};
`;

const LoadingScreen = () => {
  const { progress } = useProgress();
  // Progress dips when the loader discovers more files, but the bar shouldn't go backwards.
  const highest = useRef(0);
  highest.current = Math.max(highest.current, progress);
  const percent = Math.round(highest.current);
  const litSegments = Math.floor((percent / 100) * SEGMENTS);

  return (
    <Screen id="loading_screen">
      <Centre>
        <Status>
          <span>loading the town</span>
          <span>{percent}%</span>
        </Status>
        <Bar
          role="progressbar"
          aria-label="Loading the town"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <Segment key={i} $lit={i < litSegments} />
          ))}
          <ChromeFrame />
        </Bar>
      </Centre>
    </Screen>
  );
};

export default LoadingScreen;
