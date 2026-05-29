import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/airtableclone.mdx";

const AirtableClone = () => {
  const openInNewTab = () => {
    window.open(`/projects/airtableclone`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Airtable Clone: Full-Stack Spreadsheet App</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/rogertruong7/airtable-clone-rt"
          target="_blank"
        >
          <Button>View Repo</Button>
        </a>
        <a
          href="https://airclone-roger-truong.vercel.app/"
          target="_blank"
        >
          <Button>View Live</Button>
        </a>
        <Button onClick={openInNewTab}>Open in new tab</Button>
      </ButtonsContainer>
      <MdxSection>
        <Content components={mdxComponents} />
      </MdxSection>
    </PageContainer>
  );
};

export default AirtableClone;
