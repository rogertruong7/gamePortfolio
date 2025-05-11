import { useEffect, useState } from "react";

import MarkdownSection from "../MarkdownSection";

import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";

const ForumPage = () => {
  const openInNewTab = () => {
    window.open(`/projects/forumsite`, "_blank");
  };
  const [md, setMd] = useState("");

  useEffect(() => {
    fetch("/pageMarkdown/forumsite.md")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((text) => setMd(text))
      .catch(console.error);
  }, []);
  return (
    <PageContainer>
      <Title>DOM Manipulation Forum Page</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/rogertruong7/QandA-Forum-Website"
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

export default ForumPage;
