import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/bridges.mdx";

const Bridges = () => {
  const openInNewTab = () => {
    window.open(`/projects/bridges`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Bridges - DevSoc Projects</Title>
      <ButtonsContainer>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      <MdxSection>
        <Content components={mdxComponents} />
      </MdxSection>
    </PageContainer>
  );
};

export default Bridges;
