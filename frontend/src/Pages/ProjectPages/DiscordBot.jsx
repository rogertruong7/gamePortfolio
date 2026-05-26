import {
  PageContainer,
  Title,
  Button,
  ButtonsContainer,
} from "../PageComponents";
import MdxSection, { mdxComponents } from "../MdxComponents";
import Content from "../../content/discordbot.mdx";

const DiscordBot = () => {
  const openInNewTab = () => {
    window.open(`/projects/discordbot`, "_blank");
  };

  return (
    <PageContainer>
      <Title>Discord Economy/Gaming Bot</Title>
      <ButtonsContainer>
        <a href="https://github.com/rogertruong7/discordBot" target="_blank">
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

export default DiscordBot;
