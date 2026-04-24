import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/countriesvisited.mdx";

const CountryApi = () => {
  const openInNewTab = () => {
    window.open(`/projects/countriesvisited`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Countries Visited Python API w/ SQLite database</Title>
      <ButtonsContainer>
        <a
          href="https://github.com/rogertruong7/countries_visited_api"
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

export default CountryApi;
