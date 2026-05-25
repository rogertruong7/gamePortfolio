import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/tributaryapi.mdx";

const TributaryAPIPage = () => {
  const openInNewTab = () => {
    window.open(`/projects/tributaryapi`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Event Driven Architecture: Tributary API Project</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/tributary_api" target="_blank">
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

export default TributaryAPIPage;
