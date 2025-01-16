import React from "react";
import styled from "styled-components";


// Create the styled components
export const Container = styled.div`
  margin: 0;
  height: 100%;
  background-color: black;
`;

const TextContainer = styled.div`
  margin-left: 500px;
  margin-right: 500px;
  padding: 50px;
`

const Title = styled.h1`
  margin: 0;
  color: white;
  font-size: 2rem; /* You can adjust the font size as needed */
`;

const AboutMe = () => {
  return (
    <Container>
      <TextContainer>
        <Title>ABOUT MEEEEEEEEEEEEEE</Title>
      </TextContainer>
    </Container>
  );
};

export default AboutMe;
