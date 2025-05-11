import styled from "styled-components";

export const Button = styled.button`
  font-family: "Pixelify Sans", serif;
  background-color: rgb(255, 235, 212);
  border: none;
  border-radius: 20px;
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  color: #666;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;

  top: 20px;
  left: 20px;
  z-index: 103;

  &:hover {
    background-color:rgb(255, 208, 159);
  }
`;

export const ButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

export const PageContainer = styled.div`
  width: 100%;
  padding: 20px;
  padding-top: 40px;
  background-color: rgb(36, 36, 36);
  overflow: auto;
  padding-left: 100px;
  padding-right: 100px;
  font-family: "Pixelify Sans", serif;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 8px; /* Skinny scrollbar */
  }

  &::-webkit-scrollbar-thumb {
    background-color: #c7c7c7; /* Scrollbar thumb color */
    border-radius: 10px; /* Rounded edges for the thumb */
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #555; /* Thumb color on hover */
  }

  &::-webkit-scrollbar-track {
    background: rgb(234, 234, 234); /* Track background */
    border-radius: 10px; /* Rounded track edges */
  }

  @media (max-width: 700px) {
    padding-left: 40px;
    padding-right: 40px;
    margin: 0;
  }
`;

export const Title = styled.h1`
  font-size: 2.5rem;
  color: #fff;
  text-align: center;
  margin-bottom: 20px;
`;

export const Section = styled.div`
  margin-bottom: 20px;
  font-family: "Roboto", serif;
`;

export const Subtitle = styled.h2`
  font-size: 1.8rem;
  color: #fff;
  margin-bottom: 10px;
`;

export const Subsubtitle = styled.h2`
  font-size: 1.4rem;
  color: #fff;
  margin-bottom: 10px;
`;

export const Paragraph = styled.p`
  font-size: 1rem;
  color: #fff;
  line-height: 1.6;
  margin-bottom: 10px;
`;

export const List = styled.ul`
  margin-left: 20px;
  list-style: disc;
`;

export const ListItem = styled.li`
  font-size: 1rem;
  color: #fff;
  margin-bottom: 5px;
`;

export const StyledTable = styled.table`
  border: 1px solid #f2f2f2;
  border-collapse: collapse;
  margin-bottom: 2rem;
  color: white;
`;

export const StyledTh = styled.th`
  border: 1px solid #f2f2f2;
  padding: 12px;
  background-color:rgb(97, 97, 97);
  font-size: 1.1rem;
`;

export const StyledTd = styled.td`
  border: 1px solid #f2f2f2;
  padding: 12px;
`;
