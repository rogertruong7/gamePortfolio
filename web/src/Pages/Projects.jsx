import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import cat1 from "../assets/roomArt/projectsCat.png";
import Typewriter from "typewriter-effect";
import data from "./ShowcaseStatic.json";
const projectsScript = data.projects.script;
import OptionSelector from "./OptionSelector";
import DocumentPage from "./DocumentPage";
import { documentSlideStyles, gamePanelSlideStyles, useDocumentSlide } from "./documentSlide";
import { projects as projectEntries } from "./catalog";

const Projects = () => {
  const twRef = useRef(null);
  const [cat1Visible, setCat1Visible] = useState(true);
  const [optionCount, setOptionCount] = useState(-1);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { pageToShow, phase, openPage, closePage } = useDocumentSlide();
  const [cameFromBack, setCameFromBack] = useState(false);
  const [lessThan1700, setLessThan1700] = useState(true);
  const [skipText, setSkipText] = useState(false);

  const showOptions = () => {
    setTimeout(() => {
      setOptionsVisible(true);
    }, 200);
  };

  useEffect(() => {
    const finishImmediately = () => {
      const tw = twRef.current;
      if (!tw) return;
      setSkipText(true);
      tw.stop();
      showOptions();
    };

    window.addEventListener('click', finishImmediately);
    return () => window.removeEventListener('click', finishImmediately);
  }, [showOptions]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1700px)");
    const handleResize = (e) => setLessThan1700(e.matches);

    // Check on initial load
    setLessThan1700(mediaQuery.matches);

    // Add listener
    mediaQuery.addEventListener("change", handleResize);

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setOptionCount(0), 500);
    return () => clearTimeout(timeout);
  }, []);

  

  return (
    <>
      <Container>
        <Door />
        <GameContainer
          $phase={phase}
          style={{
            display: lessThan1700 && phase === "open" ? "none" : "block",
          }}
        >
          <ImageWrapper>
            {cat1Visible && <ImageContainer src={cat1} alt="aboutMeCat1" />}
          </ImageWrapper>
          <SelectionContainer id="selectionContainer">
            <Intro>
              {optionCount === 0 &&
                (skipText || cameFromBack ? (
                  projectsScript[0]
                ) : (
                  <Typewriter
                    options={{ delay: 10 }}
                    onInit={(typewriter) => {
                      twRef.current = typewriter;
                      typewriter.typeString(projectsScript[0]).callFunction(showOptions).start();
                    }}
                  />
                ))}
            </Intro>
            {optionsVisible && (
              <OptionSelector
                setPageToShow={openPage}
                entries={projectEntries}
                section="Project"
                active={!pageToShow || !lessThan1700}
              />
            )}
          </SelectionContainer>
        </GameContainer>
        {pageToShow && (
          <DocumentSlide key={projectEntries[pageToShow - 1].slug} $phase={phase}>
            <DocumentPage
              entry={projectEntries[pageToShow - 1]}
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

const arrowStyle = {
  width: "30px",
  height: "50px",
  position: "absolute",
  right: "0",
  bottom: "0",
};

// What the cat says, above the book
const Intro = styled.h1`
  flex-shrink: 0;
  min-height: 2.6em;
  margin: 0 0 clamp(12px, 2.5vh, 28px);
  color: white;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(1rem, 0.75rem + 1vw, 1.9rem);
  font-weight: normal;
  line-height: 1.3;
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

// Lives inside Container because Container is positioned, so it would paint over a door before it
const Door = styled.div`
  top: 0;
  left: 0;
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
  display: flex;
  flex-direction: column;
  width: 1100px;
  height: 50%;
  margin: 0;
  border: 10px solid white;
  background-color: black;
  padding: clamp(14px, 3vw, 44px) clamp(14px, 4vw, 56px);
  position: relative;

  box-sizing: border-box;
  overflow: auto;

  @media (max-width: 1108px) {
    width: 100%;
  }

  @media (max-width: 650px) {
    height: 62%;
    border-width: 6px;
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
  }

  @media (max-width: 650px) {
    height: 38%;
  }
`;

const ImageContainer = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
`;

export default Projects;
