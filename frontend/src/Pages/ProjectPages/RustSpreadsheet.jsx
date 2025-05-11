import React, { useEffect, useState } from "react";
import styled from "styled-components";

import MarkdownSection from "../MarkdownSection";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";

const RustSpreadsheet = () => {
  const openInNewTab = () => {
    window.open(`/projects/rsheet`, "_blank");
  };

  const [md, setMd] = useState("");

  useEffect(() => {
    fetch("/pageMarkdown/rsheet.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((text) => setMd(text))
      .catch(console.error);
  }, []);

  return (
    <PageContainer>
      <Title>Simple Math Spreadsheet w/ Thread Concurrency (Rust)</Title>
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

export default RustSpreadsheet;
