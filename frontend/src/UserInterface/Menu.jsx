import React, { useEffect, useState } from "react";
import styled from "styled-components";
import resume from "../assets/RogerTruongResume.pdf";

// Styled components for Menu and Button
const MenuContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 5px;
  top: 20px;
  right: 20px;
  z-index: 101;
`;
const SmallMenuContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 5px;
  top: 70px;
  right: 20px;

  z-index: 101;
`;

const DefaultButton = styled.button`
  font-family: "Pixelify Sans", serif;
  background-color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  color: #666;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  width: 130px;

  &:hover {
    background-color: #f0f0f0;
  }
`;

const HamburgerMenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 140;

  /* Lines for the hamburger menu */
  &::before,
  &::after,
  div {
    content: "";
    width: 25px;
    height: 5px;
    background-color: white;
    border-radius: 3px;
  }

  /* Center line style */
  div {
    width: 25px;
  }

  /* Show the hamburger menu only on smaller screens */
  @media (min-width: 1100px) {
    display: none; /* Hide hamburger button on screens larger than 1100px */
  }
`;

const Menu = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lessThan1100, setLessThan1100] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const handleResize = (e) => setLessThan1100(e.matches);

    // Check on initial load
    setLessThan1100(mediaQuery.matches);

    // Add listener
    mediaQuery.addEventListener("change", handleResize);

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);
  // Function to toggle the menu
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <HamburgerMenuButton onClick={toggleMenu}>
        <div />
      </HamburgerMenuButton>
      {!lessThan1100 && (
        <MenuContainer>
          <a
            href="https://github.com/rogertruong7?tab=repositories"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DefaultButton>github</DefaultButton>
          </a>
          <a
            href="https://www.linkedin.com/in/roger-truong/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DefaultButton>linkedin</DefaultButton>
          </a>
          <a href={resume} target="_blank" download="RogerTruongResume.pdf">
            <DefaultButton>download cv</DefaultButton>
          </a>
        </MenuContainer>
      )}
      {lessThan1100 && isMenuOpen && (
        <SmallMenuContainer>
          <a
            href="https://github.com/rogertruong7?tab=repositories"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DefaultButton>github</DefaultButton>
          </a>
          <a
            href="https://www.linkedin.com/in/roger-truong/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DefaultButton>linkedin</DefaultButton>
          </a>
          <a href={resume} target="_blank" download="RogerTruongResume.pdf">
            <DefaultButton>download cv</DefaultButton>
          </a>
        </SmallMenuContainer>
      )}
    </>
  );
};

export default Menu;
