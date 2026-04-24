import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/balatro.mdx";

const BalatroClone = () => {
  const openInNewTab = () => {
    window.open(`/projects/balatro`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Balatro Clone (Rust)</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/rogertruong7/balatro_clone.git"
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

export default BalatroClone;
