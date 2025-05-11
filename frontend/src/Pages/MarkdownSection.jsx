import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RotatingLines } from "react-loader-spinner";
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

const Loading = () => (
  <RotatingLines
    strokeColor="grey"
    strokeWidth="5"
    animationDuration="0.75"
    width="96"
    visible={true}
  />
);

const MarkdownSection = ({ md }) => (
  <Section>
    {(md && (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <Title {...props} />,
          h2: ({ node, ...props }) => <Subtitle {...props} />,
          h3: ({ node, ...props }) => <Subsubtitle {...props} />,
          p: ({ node, ...props }) => <Paragraph {...props} />,
          ul: ({ node, ordered, ...props }) => (
            <List as={ordered ? "ol" : "ul"} {...props} />
          ),
          li: ({ node, ...props }) => <ListItem {...props} />,
          table: ({ node, ...props }) => <StyledTable {...props} />,
          th: ({ node, ...props }) => <StyledTh {...props} />,
          td: ({ node, ...props }) => <StyledTd {...props} />,
        }}
      >
        {md}
      </ReactMarkdown>
    )) || (
      <>
        <br></br>
        <Loading />
      </>
    )}
  </Section>
);

export default MarkdownSection;
