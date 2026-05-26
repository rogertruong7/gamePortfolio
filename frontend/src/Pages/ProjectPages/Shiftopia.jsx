import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/shiftopia.mdx";

const Shiftopia = () => {
  const openInNewTab = () => {
    window.open(`/projects/shiftopia`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Shiftopia: Roster Management</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/unsw-cse-comp99-3900/capstone-project-26t1-3900-w14a-apple"
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

export default Shiftopia;
