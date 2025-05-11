import { useEffect, useState } from "react";

import MarkdownSection from "../MarkdownSection";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";

const CountryApi = () => {
  const openInNewTab = () => {
    window.open(`/projects/countriesvisited`, "_blank");
  };
  const [md, setMd] = useState("");

  useEffect(() => {
    fetch("/pageMarkdown/countriesvisited.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((text) => setMd(text))
      .catch(console.error);
  }, []);
  return (
    <PageContainer>
      <Title>Countries Visited Python API w/ SQLite database</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/rogertruong7/countries_visited_api"
          target="_blank"
        >
          <Button>View Repo</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      {/* Render your fetched markdown */}
      <MarkdownSection md={md}></MarkdownSection>
    </PageContainer>
  );
};

export default CountryApi;
