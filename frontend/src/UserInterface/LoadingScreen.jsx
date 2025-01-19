import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { useProgress } from "@react-three/drei";

// Define the styled-components
const LoadingContainer = styled.div`
  color: white;
  display: flex;
  flex-direction: column;
  background-color: #fad998;
  font-family: "Pixelify Sans", serif;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  z-index: 100;
  text-align: center;
`;

const LoadingBarContainer = styled.div`
  display: flex;
  justify-content: left;
  align-items: center;
  margin-top: 20px;
  gap: 5px; /* Space between the bars */
  width: 245px;
  height: 40px;
  padding: 5px;
  border: 4px solid white;
`;

const Bar = styled.div`
  width: 20px; /* Width of each bar */
  height: 40px;
  background-color: white;
`;

const LoadingScreen = () => {
  // Calculate the number of bars based on progress (progress divided by 20)
  const { progress } = useProgress();
  const previousProgress = useRef(progress); // Store the previous progress value

  // Update the previous progress on every render

  console.log("previous", previousProgress);
  console.log("current", progress);

  let barCount = 0;
  if (progress >= previousProgress.current) {
    barCount = Math.max(Math.floor(progress / 10));
    previousProgress.current = progress;
  } else {
    barCount = Math.max(Math.floor(previousProgress.current / 10));
  }
  // At least 1 bar

  const bars = Array.from({ length: barCount }, (_, index) => (
    <Bar key={index}></Bar>
  ));

  return (
    <LoadingContainer id="loading_screen">
      <h1>Loading...</h1>
      <LoadingBarContainer>{bars}</LoadingBarContainer>
    </LoadingContainer>
  );
};

export default LoadingScreen;
