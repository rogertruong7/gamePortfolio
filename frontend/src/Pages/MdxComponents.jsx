import {
  Section,
  Title,
  Subtitle,
  Paragraph,
  List,
  ListItem,
  StyledTable,
  StyledTh,
  Subsubtitle,
  StyledTd,
} from "./PageComponents.jsx";

export const mdxComponents = {
  h1: (props) => <Title {...props} />,
  h2: (props) => <Subtitle {...props} />,
  h3: (props) => <Subsubtitle {...props} />,
  p: (props) => <Paragraph {...props} />,
  ul: (props) => <List {...props} />,
  ol: (props) => <List as="ol" {...props} />,
  li: (props) => <ListItem {...props} />,
  table: (props) => <StyledTable {...props} />,
  th: (props) => <StyledTh {...props} />,
  td: (props) => <StyledTd {...props} />,
};

const MdxSection = ({ children }) => (
  <Section>{children}</Section>
);

export default MdxSection;
