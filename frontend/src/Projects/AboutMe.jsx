import React, { useState } from "react";
import styled from "styled-components";
import cat1 from "../assets/roomArt/aboutMeCat1.png";
import cat2 from "../assets/roomArt/aboutMeCat2.png";

// Create the styled components
export const Container = styled.div`
  margin: 0;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
`;

export const Door = styled.div`
  margin: 0;
  height: 100vh;
  width: 100vw;
  background-color: black;
  display: flex;
  justify-content: center;
  animation: parabolicMove 1s ease-in-out forwards;
  position: absolute;

  @keyframes parabolicMove {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100%); /* Adjust as needed */
    }
  }
`;

const TextContainer = styled.div`
  padding: 50px;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  @media (max-width: 1108px) {
    width: 95%;
  }
`;

const SelectionContainer = styled.div`
  width: 100%;
  padding: 0;
  margin: 0;
  height: 45%;
  border: 10px solid white;
  box-sizing: border-box;
  background-color: black;
`;

const Title = styled.h1`
  margin: 0;
  color: white;
  font-size: 2rem; /* You can adjust the font size as needed */
`;

const ImageWrapper = styled.div`
  height: 50%;
  overflow: hidden; /* Hide the cropped part of the image */
  display: flex;
  justify-content: center;
  align-items: center;

  @media (max-width: 1108px) {
    width: 100%;
    height: 50%;
  }
`;

const ImageContainer = styled.img`
  height: 100%;
  image-rendering: pixelated; /* Preserves pixel art style */
  margin: 0;
  padding: 0;
  object-fit: cover; /* Crop the image to fill the container */
`;

const AboutMe = () => {
  const [cat1Visible, setCat1Visible] = useState(true);
  const [cat2Visible, setCat2Visible] = useState(false);
  return (
    <>
      <Door></Door>
      <Container>
        <TextContainer>
          <ImageWrapper>
            {cat1Visible && (
              <ImageContainer src={cat1} alt="aboutMeCat1"></ImageContainer>
            )}
            {cat2Visible && (
              <ImageContainer src={cat2} alt="aboutMeCat2"></ImageContainer>
            )}
          </ImageWrapper>
          <SelectionContainer>
            <h1>Hello</h1>
          </SelectionContainer>
        </TextContainer>
      </Container>
    </>
  );
};

export default AboutMe;
