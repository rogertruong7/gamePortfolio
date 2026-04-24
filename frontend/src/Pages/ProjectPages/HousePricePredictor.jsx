import "@fontsource/roboto";
import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/houseprice.mdx";

const HousePricePredictor = () => {
  const openInNewTab = () => {
    window.open(`/projects/houseprice`, "_blank");
  };

  return (
    <PageContainer>
      <Title>House price and type predictor (Python Scikit ML)</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/tributary_api" target="_blank">
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

export default HousePricePredictor;
