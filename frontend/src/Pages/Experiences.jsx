import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import cat1 from "../assets/roomArt/experienceCat.png";
import Typewriter from "typewriter-effect";
import data from "./ShowcaseStatic.json";
import OptionSelector from "./OptionSelector";
import DocumentPage from "./DocumentPage";
import { documentSlideStyles, gamePanelSlideStyles, useDocumentSlide } from "./documentSlide";
import { experiences as experienceEntries, toOptionPages } from "./catalog";

const experiencesScript = data.experiences.script;
const experiences = toOptionPages(experienceEntries);

const Experiences = ({ setCurrentScene }) => {
  const twRef = useRef(null);
  const [cat1Visible, setCat1Visible] = useState(true);
  const [optionCount, setOptionCount] = useState(-1);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [fontSize, setFontSize] = useState(3);
  const { pageToShow, phase, openPage, closePage } = useDocumentSlide();
  const [cameFromBack, setCameFromBack] = useState(false);
  const [lessThan1700, setLessThan1700] = useState(true);
  const [skipText, setSkipText] = useState(false);

  const showOptions = () => {
    setTimeout(() => {
      setOptionsVisible(true);
    }, 200);
  };

  const Text1 = ({ text, fontSize }) => <H1 fontSize={fontSize}>{text}</H1>;

  useEffect(() => {
    const finishImmediately = () => {
      const tw = twRef.current;
      if (!tw) return;
      setSkipText(true);
      tw.stop();
      showOptions();
    };

    window.addEventListener("click", finishImmediately);
    return () => window.removeEventListener("click", finishImmediately);
  }, [fontSize, showOptions]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1700px)");
    const handleResize = (e) => setLessThan1700(e.matches);

    setLessThan1700(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleResize);

    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setOptionCount(0), 500);
    const handleResize = () => {
      if (window.innerWidth > 950) {
        setFontSize(2);
      } else if (window.innerWidth <= 500) {
        setFontSize(1);
      } else if (window.innerWidth <= 600) {
        setFontSize(1.2);
      } else if (window.innerWidth <= 950) {
        setFontSize(1.5);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <Door />
      <Container>
        <GameContainer
          $phase={phase}
          style={{
            display: lessThan1700 && phase === "open" ? "none" : "block",
          }}
        >
          <ImageWrapper>
            {cat1Visible && <ImageContainer src={cat1} alt="experienceCat" />}
          </ImageWrapper>
          <SelectionContainer id="selectionContainer">
            <TextContainer>
              {optionCount === 0 && !cameFromBack && (
                skipText ? (
                  <Text1 fontSize={fontSize} text={experiencesScript[0]} />
                ) : (
                  <Typewriter
                    onInit={(typewriter) => {
                      twRef.current = typewriter;
                      typewriter
                        .changeDelay(10)
                        .typeString(
                          `<h1 style='margin: 0; color: white; font-family: Determination Mono, Pixelify Sans, serif; font-size: ${fontSize}rem; padding-right: 0px;'>${experiencesScript[0]}</h1>`
                        )
                        .callFunction(showOptions)
                        .start();
                    }}
                  />
                )
              )}
              {optionCount === 0 && cameFromBack && (
                <h1
                  style={{
                    marginTop: 0,
                    color: "white",
                    fontFamily: '"Determination Mono", "Pixelify Sans", serif',
                    fontSize: `${fontSize}rem`,
                    paddingRight: "0px",
                  }}
                >
                  {experiencesScript[0]}
                </h1>
              )}
            </TextContainer>
            {optionsVisible && (
              <OptionSelector
                setPageToShow={openPage}
                data={experiences}
                section="Experience"
              />
            )}
          </SelectionContainer>
        </GameContainer>
        {pageToShow && (
          <DocumentSlide key={experienceEntries[pageToShow - 1].slug} $phase={phase}>
            <DocumentPage
              entry={experienceEntries[pageToShow - 1]}
              onBack={() => {
                closePage();
                setCameFromBack(true);
              }}
            />
          </DocumentSlide>
        )}
      </Container>
    </>
  );
};

const H1 = styled.h1`
  margin: 0;
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: ${({ fontSize }) => fontSize}rem;
  padding-right: 0;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 20%;
  margin: 0;
  position: relative;

  @media (max-width: 500px) {
    height: 15%;
  }
`;

export const Container = styled.div`
  margin: 0;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
`;

const DocumentSlide = styled.div`
  ${documentSlideStyles}
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
  ${gamePanelSlideStyles}

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
  padding: 5%;
  position: relative;
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
    width: 100%;
    height: 50%;
  }
`;

const ImageContainer = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
`;

export default Experiences;
