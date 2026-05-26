import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/tiktokextension.mdx";

const TikTokSpeed = () => {
  const openInNewTab = () => {
    window.open(`/projects/tiktokextension`, "_blank");
  };

  return (
    <PageContainer>
      <Title>TikTok Hold for 2x Speed Chrome Extension</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/TikTok-Speed-Chrome-Extension" target="_blank">
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

export default TikTokSpeed;
