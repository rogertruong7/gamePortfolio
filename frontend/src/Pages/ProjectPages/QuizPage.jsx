import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/quizwebsite.mdx";

const QuizPage = () => {
  const openInNewTab = () => {
    window.open(`/projects/quizwebsite`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Quiz Website w/ REST API (TypeScript)</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/rogertruong7/Quiz-App-Backend"
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

export default QuizPage;
