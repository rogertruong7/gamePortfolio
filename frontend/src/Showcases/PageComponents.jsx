import styled from "styled-components";

export const PageContainer = styled.div`
  width: 100%;
  max-width: 900px;
  padding: 20px;
  background-color: rgb(255, 255, 255);
  overflow: auto;
  padding-left: 100px;
  padding-right: 100px;
  font-family: "Roboto", serif;

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
  }
`;

export const Title = styled.h1`
  font-size: 2.5rem;
  color: #333;
  text-align: center;
  margin-bottom: 20px;
`;

export const Section = styled.div`
  margin-bottom: 20px;
`;

export const Subtitle = styled.h2`
  font-size: 1.8rem;
  color: #555;
  margin-bottom: 10px;
`;

export const Paragraph = styled.p`
  font-size: 1rem;
  color: #444;
  line-height: 1.6;
  margin-bottom: 10px;
`;

export const List = styled.ul`
  margin-left: 20px;
  list-style: disc;
`;

export const ListItem = styled.li`
  font-size: 1rem;
  color: #444;
  margin-bottom: 5px;
`;

export const StyledTable = styled.table`
  width: 100%;
  border: 1px solid black;
  border-collapse: collapse;
  margin-bottom: 2rem;
`;

export const StyledTh = styled.th`
  border: 1px solid black;
  padding: 12px;
  background-color: #f2f2f2;
  font-size: 1.1rem;
`;

export const StyledTd = styled.td`
  border: 1px solid black;
  padding: 12px;
`;
