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
  z-index: 200;
`;

const PopupContent = styled.div`
  background-color: white;
  padding: 20px;
  text-align: center;
  border-radius: 8px;
  z-index: 101;
  width: 400px;
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

const HelpPopup = ({ setShowHelp }) => {
  const handleClose = () => {
    setShowHelp(false);
  };

  return (
    <PopupWrapper>
      <PopupContent>
        <h2>Help Page</h2>
        <h3>Controls</h3>
        <p>You can use WASD/Arrow keys to move.</p>
        <p>You can also click to move to that location.</p>
        <p>Hold your mouse to move the camera.</p>
        <p>Walk to a building and click enter to learn more about that section.</p>
        <p>Press the reset button to reset your position.</p>
        <h3>About this Website</h3>
        <p>
          This website was made entirely by me and uses React Three Fiber, a
          react renderer for three.js.
        </p>
        <p>
          The repository can be found 
          <a href="https://github.com/rogertruong7/gamePortfolio" target="_blank"> here.</a>
        </p>

        <p>All of the cats were drawn by me.</p>
        <p>The 3D models were found online and edited in blender.</p>
        <DefaultButton onClick={handleClose}>OK</DefaultButton>
      </PopupContent>
    </PopupWrapper>
  );
};

export default HelpPopup;
