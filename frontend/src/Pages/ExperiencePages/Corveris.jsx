import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/corveris.mdx";

const Corveris = () => {
  const openInNewTab = () => {
    window.open(`/experiences/corveris`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Corveris - Full Stack Engineer</Title>
      <ButtonsContainer>
        <a href="https://www.corveris.com/" target="_blank">
          <Button>Visit Corveris</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      <MdxSection>
        <Content components={mdxComponents} />
      </MdxSection>
    </PageContainer>
  );
};

export default Corveris;
