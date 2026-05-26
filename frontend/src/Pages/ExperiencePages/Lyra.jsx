import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/lyra.mdx";

const Lyra = () => {
  const openInNewTab = () => {
    window.open(`/experiences/lyra`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Lyra - Forward Deployed Engineer</Title>
      <ButtonsContainer>
        <a href="https://lyratechnologies.com.au/" target="_blank">
          <Button>Visit Lyra</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      <MdxSection>
        <Content components={mdxComponents} />
      </MdxSection>
    </PageContainer>
  );
};

export default Lyra;
