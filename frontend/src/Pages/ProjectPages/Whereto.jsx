import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/whereto.mdx";

const Whereto = () => {
  const openInNewTab = () => {
    window.open(`/projects/whereto`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Whereto: Social Date Planning App</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/whereto" target="_blank">
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

export default Whereto;
