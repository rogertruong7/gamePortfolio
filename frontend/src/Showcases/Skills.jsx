import React, { useEffect, useState } from "react";
import styled from "styled-components";
import cat1 from "../assets/roomArt/aboutMeCat1.png";
import cat2 from "../assets/roomArt/aboutMeCat2.png";
import arrowdown from "../assets/arrowdown.gif";
import Typewriter from "typewriter-effect";
import { aboutMeScript } from "./Lines";

const Skills = ({ setCurrentScene }) => {
  const [cat1Visible, setCat1Visible] = useState(true);
  const [cat2Visible, setCat2Visible] = useState(false);
  const [optionCount, setOptionCount] = useState(-1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [canClick, setCanClick] = useState(false);
  const [endOfText, setEndOfText] = useState(false);
  const [fontSize, setFontSize] = useState(3);

  const onNextText = () => {
    setOptionCount((prevCount) => prevCount + 1);
    // setCat2Visible((prev) => !prev);
    // setCat1Visible((prev) => !prev);
    setCanClick(false);
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (canClick) {
        onNextText();
      }
    };

    const selectionContainer = document.getElementById("selectionContainer");
    selectionContainer.addEventListener("click", handleClick);

    const handleKeyDown = (event) => {
      if (["Space", "Enter"].includes(event.code) && canClick) {
        onNextText();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      selectionContainer.removeEventListener("click", handleClick);
    };
  }, [canClick]);

  useEffect(() => {
    const img = new Image();
    img.src = cat2;
    img.onload = () => setIsLoaded(true);

    const timeout = setTimeout(() => setOptionCount(0), 500);
    const handleResize = () => {
      if (window.innerWidth > 800) {
        setFontSize(3);
      } else if (window.innerWidth <= 800) {
        setFontSize(2);
      } else if (window.innerWidth <= 600) {
        setFontSize(1);
      } else if (window.innerWidth <= 400) {
        setFontSize(0.4);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const renderText = (index) => (
    <Typewriter
      onInit={(typewriter) => {
        typewriter
          .changeDelay(10)
          .typeString(
            `<h1 style='margin: 0; color: white; font-size: ${fontSize}rem; padding-right: 0px;'>${aboutMeScript[index]}</h1>`
          )
          .callFunction(() => {
            setCanClick(true);
            if (index === 4) {
              setEndOfText(true);
            }
          })
          .start();
      }}
    />
  );

  return (
    <>
      <Door />
      <Container>
        <GameContainer>
          <ImageWrapper>
            {cat1Visible && <ImageContainer src={cat1} alt="aboutMeCat1" />}
            {cat2Visible && isLoaded && (
              <ImageContainer src={cat2} alt="aboutMeCat2" />
            )}
          </ImageWrapper>
          <SelectionContainer id="selectionContainer">
            <TextContainer>
              {optionCount === 0 && renderText(0)}
              {optionCount === 1 && renderText(1)}
              {optionCount === 2 && renderText(2)}
              {optionCount === 3 && renderText(3)}
              {optionCount >= 4 && renderText(4)}
              {optionCount < 4 && canClick && (
                <img style={arrowStyle} src={arrowdown} />
              )}
            </TextContainer>
            {optionCount >= 4 && endOfText && (
              <ExitButton onClick={() => setCurrentScene(0)}>Exit</ExitButton>
            )}
          </SelectionContainer>
        </GameContainer>
      </Container>
    </>
  );
};

const arrowStyle = {
  width: "30px",
  height: "50px",
  position: "absolute",
  right: "0",
  bottom: "0",
};

const ExitButton = styled.button`
  font-family: "Pixelify Sans", serif;
  background-color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  color: #666;
  cursor: pointer;
  width: 100px;
  position: absolute;
  bottom: 20px;
  right: 20px;

  &:hover {
    background-color: rgb(171, 171, 171);
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
  position: relative;
`;

const Text = styled.h1`
  margin: 0;
  color: white;
  font-size: 3rem;
  padding-right: 0px;
`;

export const Container = styled.div`
  margin: 0;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
`;

const Door = styled.div`
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
      transform: translateX(-100%);
    }
  }
`;

const GameContainer = styled.div`
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
  width: 1100px;
  height: 45%;
  margin: 0;
  border: 10px solid white;
  background-color: black;
  padding: 50px;
  position: relative;
  cursor: pointer;
  box-sizing: border-box;
  overflow: auto;

  @media (max-width: 1108px) {
    width: 95%;
    height: 50%;
  }
`;

const ImageWrapper = styled.div`
  width: 1100px;
  height: 50%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (max-width: 1108px) {
    width: 95%;
    height: 50%;
  }
`;

const ImageContainer = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
`;

export default Skills;
