import React from "react";
import styled from "styled-components";
import resume from "../assets/RogerTruongResume.pdf"

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

const Menu = () => {
  return (
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
  );
};

export default Menu;
