import React from "react";
import styled from "styled-components";
import { Container } from "./AboutMe";
// Create the styled components

const Title = styled.h1`
  margin: 0;
  color: white;
  font-size: 2rem; /* You can adjust the font size as needed */
`;

const Experiences = () => {
  return (
    <Container>
      <Title>Experiences</Title>
    </Container>
  );
};

export default Experiences;
