import { useState, useEffect } from "react";
import styled from "styled-components";

// Data is an array of strings
const OptionSelector = ({ setPageToShow, data }) => {
  const [currentPage, setCurrentPage] = useState(0); // Current page index
  const [selectedIndex, setSelectedIndex] = useState(0); // Default: Top Left

  const currentOptions = data[currentPage];

  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 650px)");

    // Function to update state based on media query
    const handleMediaChange = (e) => {
      setIsMobileView(e.matches); // `e.matches` is `true` if media query matches
    };

    // Initial check and add listener
    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaChange);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      if (selectedIndex + 1 === currentOptions.length && selectedIndex !== 3) {
        console.log("last option");
      } else if (selectedIndex === 3 && currentPage < data.length - 1) {
        setCurrentPage((prev) => prev + 1);
        setSelectedIndex(0);
      } else if (selectedIndex < 3) {
        setSelectedIndex((prev) => prev + 1);
      }
    } else if (e.key === "ArrowLeft") {
      if (selectedIndex === 0 && currentPage > 0) {
        setCurrentPage((prev) => prev - 1);
        setSelectedIndex(3);
      } else if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      }
    } else if (e.key === "ArrowUp") {
      if (isMobileView) {
        if (selectedIndex === 0 && currentPage > 0) {
          setCurrentPage((prev) => prev - 1);
          setSelectedIndex(3);
        } else if (selectedIndex > 0) {
          setSelectedIndex((prev) => prev - 1);
        }
      } else if (selectedIndex === 2 || selectedIndex === 3) {
        setSelectedIndex((prev) => prev - 2);
      }
    } else if (e.key === "ArrowDown") {
      if (isMobileView) {
        if (
          selectedIndex + 1 === currentOptions.length &&
          selectedIndex !== 3
        ) {
          console.log("last option");
        } else if (selectedIndex === 3 && currentPage < data.length - 1) {
          setCurrentPage((prev) => prev + 1);
          setSelectedIndex(0);
        } else if (selectedIndex < 3) {
          setSelectedIndex((prev) => prev + 1);
        }
      } else if (selectedIndex === 0 || selectedIndex === 1) {
        setSelectedIndex((prev) => prev + 2);
      }
    } else if (e.key === "Enter") {
      handleClickOption(selectedIndex);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, selectedIndex]);

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setSelectedIndex(3); // Default to last option of the previous page
    }
  };

  const goToNextPage = ({ setPageToShow }) => {
    if (currentPage < data.length - 1) {
      setCurrentPage((prev) => prev + 1);
      setSelectedIndex(0); // Default to first option of the next page
    }
  };

  const handleClickOption = (index) => {
    setPageToShow(currentPage * 4 + (index + 1));
  };

  return (
    <Container>
      {/* Arrows */}
      {currentPage > 0 && (
        <LeftArrowButton onClick={goToPreviousPage}>
          &#9664; {/* Left Arrow */}
        </LeftArrowButton>
      )}
      {currentPage < data.length - 1 && (
        <RightArrowButton onClick={goToNextPage}>
          &#9654; {/* Right Arrow */}
        </RightArrowButton>
      )}

      {/* Options Grid */}
      <Grid>
        {currentOptions.map((option, index) => (
          <Option
            key={index}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => handleClickOption(index)}
          >
            <PixelBook selected={selectedIndex === index} />
            <Text selected={selectedIndex === index}>{option}</Text>
          </Option>
        ))}
      </Grid>
    </Container>
  );
};

const Text = styled.div`
  margin: 0;
  color: white;
  width: 100%;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: 1.3rem;
  padding-left: 10px;
  padding-right: 10px;
  border-radius: 20px;
  height: 100%;
  display: flex;
  justify-content: left;
  align-items: center;
  border: ${({ selected }) =>
    selected ? "2px dashed white" : "2px solid transparent"};

  @media (max-width: 800px) {
    font-size: 0.8rem;
  }
`;

const D = "#201a3d";
const P = "#f0e8d0";
const L = "#b0a898";
const R = "#9b2848";
const H = "#d44868";
const G = "#e08030";
const S = "#5c3a1e";

const pageRow = (y) => (
  <>
    <rect x="0" y={y} width="1" height="1" fill={D}/>
    <rect x="1" y={y} width="8" height="1" fill={P}/>
    <rect x="11" y={y} width="8" height="1" fill={P}/>
    <rect x="19" y={y} width="1" height="1" fill={D}/>
  </>
);

const textRow = (y) => (
  <>
    <rect x="0" y={y} width="1" height="1" fill={D}/>
    <rect x="1" y={y} width="2" height="1" fill={P}/>
    <rect x="3" y={y} width="4" height="1" fill={L}/>
    <rect x="7" y={y} width="2" height="1" fill={P}/>
    <rect x="11" y={y} width="2" height="1" fill={P}/>
    <rect x="13" y={y} width="4" height="1" fill={L}/>
    <rect x="17" y={y} width="2" height="1" fill={P}/>
    <rect x="19" y={y} width="1" height="1" fill={D}/>
  </>
);

const PixelBook = ({ selected }) => (
  <BookWrapper>
    <svg
      viewBox="0 0 20 14"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      style={{ height: "100%", width: "auto", opacity: selected ? 1 : 0 }}
    >
      {/* Row 0: top outline */}
      <rect x="2" y="0" width="6" height="1" fill={D}/>
      <rect x="12" y="0" width="6" height="1" fill={D}/>
      {/* Row 1: stepped page + spine */}
      <rect x="1" y="1" width="1" height="1" fill={D}/>
      <rect x="2" y="1" width="6" height="1" fill={P}/>
      <rect x="8" y="1" width="1" height="1" fill={D}/>
      <rect x="9" y="1" width="2" height="1" fill={S}/>
      <rect x="11" y="1" width="1" height="1" fill={D}/>
      <rect x="12" y="1" width="6" height="1" fill={P}/>
      <rect x="18" y="1" width="1" height="1" fill={D}/>
      {/* Spine column for rows 2-10 */}
      <rect x="9" y="2" width="2" height="9" fill={S}/>
      {/* Rows 2-9: alternating page / text */}
      {pageRow(2)}
      {textRow(3)}
      {pageRow(4)}
      {textRow(5)}
      {pageRow(6)}
      {textRow(7)}
      {pageRow(8)}
      {textRow(9)}
      {/* Row 10: cover top */}
      <rect x="0" y="10" width="1" height="1" fill={D}/>
      <rect x="1" y="10" width="1" height="1" fill={H}/>
      <rect x="2" y="10" width="7" height="1" fill={R}/>
      <rect x="11" y="10" width="7" height="1" fill={R}/>
      <rect x="18" y="10" width="1" height="1" fill={H}/>
      <rect x="19" y="10" width="1" height="1" fill={D}/>
      {/* Row 11: cover */}
      <rect x="1" y="11" width="1" height="1" fill={D}/>
      <rect x="2" y="11" width="7" height="1" fill={R}/>
      <rect x="9" y="11" width="2" height="1" fill={D}/>
      <rect x="11" y="11" width="7" height="1" fill={R}/>
      <rect x="18" y="11" width="1" height="1" fill={D}/>
      {/* Row 12: cover + clasp */}
      <rect x="2" y="12" width="1" height="1" fill={D}/>
      <rect x="3" y="12" width="5" height="1" fill={R}/>
      <rect x="8" y="12" width="4" height="1" fill={G}/>
      <rect x="12" y="12" width="5" height="1" fill={R}/>
      <rect x="17" y="12" width="1" height="1" fill={D}/>
      {/* Row 13: bottom outline */}
      <rect x="3" y="13" width="14" height="1" fill={D}/>
    </svg>
  </BookWrapper>
);

const BookWrapper = styled.div`
  height: 25%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

// Styled components
const Container = styled.div`
  width: 100%;
  height: 80%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  padding-top: 30px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 5px;
  height: 90%;
  flex: 1;
  width: 85%;

  @media (max-width: 650px) {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
  }
`;

const LeftArrowButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  color: grey;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  left: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  background-color: transparent;
  border: 2px solid transparent;

  &:hover {
    border: 2px solid white;
    color: white;
  }
`;

const RightArrowButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  color: grey;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  right: 10px;
  background-color: transparent;
  box-sizing: border-box;
  border-radius: 10px;
  border: 2px solid transparent;

  &:hover {
    border: 2px solid white;
    color: white;
  }
`;

const Option = styled.div`
  display: flex;
  align-items: center;
  justify-content: left;
  height: 100%;
  cursor: pointer;
  position: relative;
  gap: 20px;
`;

export default OptionSelector;
