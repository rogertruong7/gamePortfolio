import React, { useState, useEffect } from "react";
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
            <ArrowText selected={selectedIndex === index}>&gt;</ArrowText>
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

const ArrowText = styled.h1`
  margin: 0;
  color: ${({ selected }) => (selected ? "white" : "black")};
  font-size: 1.3rem;
  padding: 0px;

  @media (max-width: 800px) {
    font-size: 0.8rem;
  }
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
