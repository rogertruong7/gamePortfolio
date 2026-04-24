import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/forumsite.mdx";

const ForumPage = () => {
  const openInNewTab = () => {
    window.open(`/projects/forumsite`, "_blank");
  };

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
      <MdxSection>
        <Content components={mdxComponents} />
      </MdxSection>
    </PageContainer>
  );
};

export default ForumPage;
