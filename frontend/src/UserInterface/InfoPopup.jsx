import React, { useState } from "react";
import styled from "styled-components";

const PopupWrapper = styled.div`
  font-family: "Pixelify Sans", serif;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

const PopupContent = styled.div`
  background-color: white;
  padding: 20px;
  text-align: center;
  border-radius: 8px;
  z-index: 101;
`;

const DefaultButton = styled.button`
  font-family: "Pixelify Sans", serif;
  background-color: rgb(255, 229, 162);
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  color: #666;
  box-shadow: 0px 2px 4px rgba(255, 113, 19, 0.2);
  cursor: pointer;
  width: 130px;

  &:hover {
    background-color: rgb(244, 189, 95);
  }
`;

const InfoPopup = ({ setShowPopup }) => {
  const handleClose = () => {
    localStorage.setItem("visited", true);
    setShowPopup(false);
  };

  return (
    <PopupWrapper>
      <PopupContent>
        <h2>Hi, I'm Roger and welcome to my Portfolio!</h2>
        <p>You can use WASD/Arrow keys to move.</p>
        <p>You can also click to move to that location.</p>
        <p>Enter whichever building you want!</p>
        <p>Hold your mouse to move the camera.</p>
        <DefaultButton onClick={handleClose}>OK</DefaultButton>
      </PopupContent>
    </PopupWrapper>
  );
};

export default InfoPopup;
