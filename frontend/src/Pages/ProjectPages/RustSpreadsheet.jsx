import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/rsheet.mdx";

const RustSpreadsheet = () => {
  const openInNewTab = () => {
    window.open(`/projects/rsheet`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Simple Math Spreadsheet w/ Thread Concurrency (Rust)</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/Multithread-Math-Spreadsheet" target="_blank">
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

export default RustSpreadsheet;
