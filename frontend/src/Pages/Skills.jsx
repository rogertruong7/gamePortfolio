import { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import cat1 from "../assets/roomArt/skillsCat.png";
import arrowdown from "../assets/arrowdown.gif";
import Typewriter from "typewriter-effect";
import data from "./ShowcaseStatic.json";

const skillsScript = data.skills.script;
const lastIndex = skillsScript.length - 1;

const Skills = ({ setCurrentScene }) => {
  const twRef = useRef(null);
  const [optionCount, setOptionCount] = useState(-1);
  const [canClick, setCanClick] = useState(false);
  const [endOfText, setEndOfText] = useState(false);
  const [fontSize, setFontSize] = useState(3);
  const [skipText, setSkipText] = useState(-1);

  const onNextText = () => {
    setSkipText(optionCount);
    setOptionCount((prevCount) => prevCount + 1);
    setCanClick(false);
  };

  useEffect(() => {
    const finishImmediately = () => {
      const tw = twRef.current;
      if (!tw) return;
      if (!canClick) {
        tw.stop();
        setCanClick(true);
        setSkipText(optionCount);

        if (optionCount === lastIndex) {
          setEndOfText(true);
        }
      }
    };

    const handleKeySkip = (event) => {
      if (["Space", "Enter"].includes(event.code)) {
        finishImmediately();
      }
    };

    const selectionContainer = document.getElementById("selectionContainer");
    selectionContainer.addEventListener("click", finishImmediately);
    window.addEventListener("keydown", handleKeySkip);
    return () => {
      selectionContainer.removeEventListener("click", finishImmediately);
      window.removeEventListener("keydown", handleKeySkip);
    };
  }, [fontSize, onNextText]);

  useEffect(() => {
    const handleClick = () => {
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
    const timeout = setTimeout(() => setOptionCount(0), 500);
    const handleResize = () => {
      if (window.innerWidth > 950) {
        setFontSize(3);
      } else if (window.innerWidth <= 500) {
        setFontSize(1.2);
      } else if (window.innerWidth <= 600) {
        setFontSize(1.5);
      } else if (window.innerWidth <= 950) {
        setFontSize(2);
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
        twRef.current = typewriter;
        typewriter
          .changeDelay(10)
          .typeString(
            `<h1 style='margin: 0; color: white; font-family: Determination Mono, Pixelify Sans, serif; font-size: ${fontSize}rem; padding-right: 0px;'>${skillsScript[index]}</h1>`
          )
          .callFunction(() => {
            setCanClick(true);
            if (index === lastIndex) {
              setEndOfText(true);
            }
          })
          .start();
      }}
    />
  );

  const Text1 = ({ text, fontSize }) => <H1 fontSize={fontSize}>{text}</H1>;

  return (
    <>
      <Door />
      <Container>
        <GameContainer>
          <ImageWrapper>
            <ImageContainer src={cat1} alt="skillsCat" />
          </ImageWrapper>
          <SelectionContainer id="selectionContainer">
            <TextContainer>
              {skillsScript.map((text, index) => {
                if (index < lastIndex) {
                  if (optionCount === index) {
                    return skipText === index ? (
                      <Text1 key={index} fontSize={fontSize} text={text} />
                    ) : (
                      renderText(index)
                    );
                  }
                  return null;
                }
                if (optionCount >= lastIndex) {
                  return skipText >= lastIndex ? (
                    <Text1 key={index} fontSize={fontSize} text={text} />
                  ) : (
                    renderText(lastIndex)
                  );
                }
                return null;
              })}
              {optionCount < lastIndex && canClick && (
                <img style={arrowStyle} src={arrowdown} />
              )}
            </TextContainer>
            {optionCount >= lastIndex && endOfText && (
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

const H1 = styled.h1`
  margin: 0;
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: ${({ fontSize }) => fontSize}rem;
  padding-right: 0;
`;

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

  @media (max-width: 1108px) {
    left: 20px;
    right: none;
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
  position: relative;
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
  height: 50%;
  margin: 0;
  border: 10px solid white;
  background-color: black;
  padding: 50px;
  position: relative;
  cursor: pointer;
  box-sizing: border-box;
  overflow: auto;

  @media (max-width: 1108px) {
    width: 100%;
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
