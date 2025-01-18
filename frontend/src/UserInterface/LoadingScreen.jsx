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

const LoadingBarContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 5px; /* Space between the bars */
`;

const Bar = styled.div`
  width: 40px; /* Width of each bar */
  height: 20px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
`;

const LoadingScreen = ({ progress }) => {
  // Calculate the number of active bars based on progress
  const activeBars = Math.min(Math.ceil(progress / 20), 5); // Maximum 5 bars

  return (
    <LoadingContainer id="loading_screen">
      <h1>Loading...</h1>
      <Vinyl />
      <LoadingBarContainer>
        {Array.from({ length: 5 }).map((_, index) => (
          <Bar
            key={index}
            style={{
              backgroundColor: index < activeBars ? "white" : "#ccc",
              border: `1px solid ${index < activeBars ? "#fff" : "#999"}`,
            }}
          />
        ))}
      </LoadingBarContainer>
    </LoadingContainer>
  );
};

export default LoadingScreen;
