import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/presto.mdx";

const Presto = () => {
  const openInNewTab = () => {
    window.open(`/projects/presto`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Presto: SlidesGo Clone</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/presto-deploy" target="_blank">
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

export default Presto;
