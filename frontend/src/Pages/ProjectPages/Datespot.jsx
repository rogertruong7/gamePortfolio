import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/datespot.mdx";

const Datespot = () => {
  const openInNewTab = () => {
    window.open(`/projects/datespot`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Datespot Spring Boot Project</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/datespotapp" target="_blank">
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

export default Datespot;
