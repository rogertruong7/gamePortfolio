import React, { useEffect, useState } from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Subtitle,
  Paragraph,
  List,
  ListItem,
  StyledTable,
  StyledTh,
  StyledTd,
  Button,
  ButtonsContainer,
} from "../PageComponents";

import MarkdownSection from "../MarkdownSection";

const TributaryAPIPage = () => {
  const openInNewTab = () => {
    window.open(`/projects/tributary`, "_blank");
  };

  const [md, setMd] = useState("");

  useEffect(() => {
    fetch("/pageMarkdown/tributaryapi.md") // adjust path if you put it elsewhere
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((text) => setMd(text))
      .catch(console.error);
  }, []);

  return (
    <PageContainer>
      <Title>Event Driven Architecture: Tributary API Project</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/tributary_api" target="_blank">
          <Button>View Repo</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      {/* Render your fetched markdown */}
      <MarkdownSection md={md}></MarkdownSection>
    </PageContainer>
  );
};

export default TributaryAPIPage;
