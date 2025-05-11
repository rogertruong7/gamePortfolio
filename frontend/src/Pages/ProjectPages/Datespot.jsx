import { useEffect, useState } from "react";
import MarkdownSection from "../MarkdownSection";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";

const Datespot = () => {
  const openInNewTab = () => {
    window.open(`/projects/datespot`, "_blank");
  };
  const [md, setMd] = useState("");

  useEffect(() => {
    fetch("/pageMarkdown/datespot.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((text) => setMd(text))
      .catch(console.error);
  }, []);

  return (
    <PageContainer>
      <Title>Datespot Spring Boot Project</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/datespotapp" target="_blank">
          <Button>View Repo</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      {/* Render your fetched markdown */}
      <MarkdownSection md={md}></MarkdownSection>
    </PageContainer>
  );
};

export default Datespot;
