import { useEffect, useState } from "react";
import MarkdownSection from "../MarkdownSection";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
  InternalPageContainer,
} from "../PageComponents";

const TributaryAPIPage = () => {
  const openInNewTab = () => {
    window.open(`/projects/tributaryapi`, "_blank");
  };

  const [md, setMd] = useState("");

  useEffect(() => {
    fetch("/pageMarkdown/tributaryapi.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((text) => setMd(text))
      .catch(console.error);
  }, []);

  return (
    <PageContainer>
      <InternalPageContainer>
        <Title>Event Driven Architecture: Tributary API Project</Title>
        <ButtonsContainer>
          <a href="https://github.com/rogertruong7/tributary_api" target="_blank">
            <Button>View Repo</Button>
          </a>
          <Button onClick={openInNewTab}>Open in new tab</Button>
        </ButtonsContainer>
        {/* Render your fetched markdown */}
        <MarkdownSection md={md}></MarkdownSection>
      </InternalPageContainer>
    </PageContainer>
  );
};

export default TributaryAPIPage;
