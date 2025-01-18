import React, {useState, useEffect} from "react";
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

const LoadingBarContainer = styled.div`
  display: flex;
  justify-content: left;
  align-items: center;
  margin-top: 20px;
  gap: 5px; /* Space between the bars */
  width: 220px;
  height: 64px;
  border: 4px solid white;
`;

const Bar = styled.div`
  width: 40px; /* Width of each bar */
  height: 60px;
  background-color: white;
`;

const LoadingScreen = ({ progress }) => {
  const [visible, setVisible] = useState(false);
  // Calculate the number of bars based on progress (progress divided by 20)
  const barCount = Math.max(Math.floor(progress / 20), 1); // At least 1 bar
  
  console.log("progress", progress);
  console.log("barCount", barCount);
  // Generate an array of bars to render
  
  const bars = Array.from({ length: barCount }, (_, index) => (
    <Bar key={index}></Bar>
  ));



  return (
    <LoadingContainer id="loading_screen">
      <h1>Loading...</h1>
      {progress > 20 && <h1>Hello world</h1>}
      <LoadingBarContainer>{bars}</LoadingBarContainer>
    </LoadingContainer>
  );
};


export default LoadingScreen;
