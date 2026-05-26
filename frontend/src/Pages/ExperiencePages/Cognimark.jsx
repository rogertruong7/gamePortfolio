import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/cognimark.mdx";

const Cognimark = () => {
  const openInNewTab = () => {
    window.open(`/experiences/cognimark`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Cognimark - Full Stack Engineer</Title>
      <ButtonsContainer>
        <a href="https://www.cognimark.ai/" target="_blank">
          <Button>Visit Cognimark</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      <MdxSection>
        <Content components={mdxComponents} />
      </MdxSection>
    </PageContainer>
  );
};

export default Cognimark;
