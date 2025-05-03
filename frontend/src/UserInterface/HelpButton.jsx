import React from "react";
import styled from "styled-components";

const Button = styled.button`
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
  position: absolute;
  bottom: 70px;
  right: 20px;
  z-index: 103;
  width: 80px;

  &:hover {
    background-color: #f0f0f0;
  }
`;

const HelpButton = ({  }) => {
  const showHelp = () => {
    console.log("showing help");
  };
  
  return (
    <>
      <Button onClick={showHelp}>?</Button>
    </>
  );
};

export default HelpButton;
