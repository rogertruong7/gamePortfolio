import { useRef } from "react";
import styled from "styled-components";
import { useProgress } from "@react-three/drei";
import Skyline from "./Skyline.jsx";

const ink = "#14235A";

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 clamp(24px, 8vw, 120px) clamp(150px, 32vh, 340px);
  background: #86cdeb;
  color: ${ink};
  font-family: "Pixelify Sans", "Zen Kaku Gothic New", sans-serif;
`;

const Name = styled.h1`
  margin: 0;
  font-size: clamp(52px, 11vw, 136px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
`;

const Status = styled.p`
  margin: 16px 0 0;
  font-size: clamp(20px, 3vw, 32px);
  font-weight: 500;
`;

const Town = styled(Skyline)`
  position: absolute;
  left: 0;
  bottom: 0;
  display: block;
  width: 100%;
  height: clamp(130px, 30vh, 320px);
`;

const LoadingScreen = () => {
  const { progress } = useProgress();
  // Progress dips when the loader discovers more files, but the lights shouldn't go back off.
  const highest = useRef(0);
  highest.current = Math.max(highest.current, progress);
  const percent = Math.round(highest.current);

  return (
    <Screen
      id="loading_screen"
      role="progressbar"
      aria-label="Loading the town"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <Name>Roger Truong</Name>
      <Status>Turning the town&apos;s lights on: {percent}%</Status>
      <Town lit={percent / 100} />
    </Screen>
  );
};

export default LoadingScreen;
