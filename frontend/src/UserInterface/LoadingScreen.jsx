import React from "react";
import styled from "styled-components";

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

const Vinyl = styled.div`
  /* Add specific styles for the vinyl element if needed */
`;

const LoadingBar = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
`;

const PulseDiv = styled.div`
  width: 20px;
  height: 20px;
  margin: 0 5px;
  background-color: white;
  border: 1px solid #ccc;
  animation: pulse 1.2s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.6;
    }
  }
`;

const LoadingScreen = () => {
  return (
    <LoadingContainer id="loading_screen">
      <h1>Loading...</h1>
      <Vinyl />
      <LoadingBar>
        <PulseDiv />
        <PulseDiv />
        <PulseDiv />
      </LoadingBar>
    </LoadingContainer>
  );
};

export default LoadingScreen;
