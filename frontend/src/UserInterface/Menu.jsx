import React from "react";
import styled from "styled-components";

// Styled components for Menu and Button
const MenuContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 5px;
  top: 20px;
  left: 20px;
  z-index: 101;
`;

export const DefaultButton = styled.button`
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

  &:hover {
    background-color: #f0f0f0;
  }
`;

const Menu = () => {
  return (
    <MenuContainer>
      <DefaultButton>github</DefaultButton>
      <DefaultButton>linkedin</DefaultButton>
      <DefaultButton>resume</DefaultButton>
    </MenuContainer>
  );
};

export default Menu;
