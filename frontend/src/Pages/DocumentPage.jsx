import { Suspense, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import "@fontsource/zen-kaku-gothic-new/400.css";
import "@fontsource/zen-kaku-gothic-new/500.css";
import "@fontsource/zen-kaku-gothic-new/700.css";
import { mdxComponents } from "./MdxComponents";
import Skyline from "../UserInterface/Skyline.jsx";

const ink = "#14235A";
const inkSoft = "#46557F";
const sky = "#86CDEB";
const paper = "#F7FBFD";
const crimson = "#A8123F";
const sakura = "#FFD9E2";
const body = '"Zen Kaku Gothic New", "Hiragino Sans", system-ui, sans-serif';
const pixel = '"Pixelify Sans", "Zen Kaku Gothic New", sans-serif';

// Stepped corners in the same pixel grain as the game's lettering.
const stepped = (n) => `polygon(
  0 ${n}px, ${n}px ${n}px, ${n}px 0,
  calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px,
  100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%,
  ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`;

const DemoVideo = ({ entry }) => {
  const [calm] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  return (
    <Screen>
      <video
        key={entry.slug}
        src={`/videos/${entry.slug}.mp4`}
        poster={`/videos/${entry.slug}.jpg`}
        aria-label={`Click-through demo of ${entry.title}`}
        controls
        muted
        loop
        playsInline
        autoPlay={!calm}
        preload="metadata"
      />
    </Screen>
  );
};

// `onBack` is set when the page opens from the in-game menu; a direct link gets a way home.
const DocumentPage = ({ entry, onBack }) => {
  const { Body, title, tagline, links = [], stack = [], role, period, category } = entry;
  const backLabel = entry.kind === "experience" ? "Back to experience" : "Back to projects";

  return (
    <Page>
      <Hero $hasVideo={entry.video} $standalone={!onBack}>
        <HeroInner>
          {onBack ? (
            <BackLink as="button" type="button" onClick={onBack}>
              {backLabel}
            </BackLink>
          ) : (
            <BackLink as={Link} to="/">
              Back to the town
            </BackLink>
          )}
          <Heading>{title}</Heading>
          <Tagline>{tagline}</Tagline>
          <Actions>
            {links.map((link, i) => (
              <Action
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                $primary={i === 0}
              >
                {link.label}
              </Action>
            ))}
            {onBack && (
              <Action href={entry.path} target="_blank" rel="noreferrer">
                Open in new tab
              </Action>
            )}
          </Actions>
          {entry.video && <DemoVideo entry={entry} />}
        </HeroInner>
        <HeroSkyline />
      </Hero>
      <Sheet>
        <Facts>
          {role && (
            <Fact>
              <dt>Role</dt>
              <dd>{role}</dd>
            </Fact>
          )}
          {period && (
            <Fact>
              <dt>When</dt>
              <dd>{period}</dd>
            </Fact>
          )}
          {category && (
            <Fact>
              <dt>Type</dt>
              <dd>{category}</dd>
            </Fact>
          )}
          {stack.length > 0 && (
            <Fact>
              <dt>Built with</dt>
              <Stack>
                <StackList>
                  {stack.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </StackList>
              </Stack>
            </Fact>
          )}
        </Facts>
        <Article>
          <Suspense fallback={<Loading>Opening the page</Loading>}>
            <Body components={mdxComponents} />
          </Suspense>
        </Article>
      </Sheet>
    </Page>
  );
};

const Page = styled.main`
  container-type: inline-size;
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: ${paper};
  color: ${ink};
  font-family: ${body};
  letter-spacing: normal;
  user-select: text;
  scrollbar-color: ${ink} ${paper};

  & *,
  & *::before,
  & *::after {
    box-sizing: border-box;
  }

  & :focus-visible {
    outline: 3px solid ${crimson};
    outline-offset: 3px;
  }
`;

const Hero = styled.header`
  position: relative;
  box-sizing: border-box;
  background: ${sky};
  /* In the game, the HUD's back and menu buttons float over the top of the page. */
  padding: ${({ $standalone }) => ($standalone ? "32px" : "84px")} 24px
    ${({ $hasVideo }) => ($hasVideo ? "48px" : "clamp(96px, 18cqw, 210px)")};

  @container (min-width: 760px) {
    padding-left: 56px;
    padding-right: 56px;
  }
`;

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1040px;
  margin: 0 auto;
`;

const HeroSkyline = styled(Skyline)`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: clamp(72px, 15cqw, 180px);
  display: block;
`;

const BackLink = styled.a`
  display: inline-block;
  padding: 4px 0;
  border: 0;
  background: none;
  color: ${ink};
  font: 500 16px ${body};
  text-decoration: underline;
  text-underline-offset: 4px;
  cursor: pointer;
`;

const Heading = styled.h1`
  margin: 14px 0 0;
  font: 600 clamp(44px, 9cqw, 104px) / 1 ${pixel};
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
`;

const Tagline = styled.p`
  margin: 16px 0 0;
  max-width: 34em;
  font: 500 clamp(19px, 2.4cqw, 26px) / 1.4 ${body};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;

  &:empty {
    display: none;
  }
`;

const Action = styled.a`
  display: inline-block;
  padding: 11px 18px;
  clip-path: ${stepped(4)};
  background: ${({ $primary }) => ($primary ? crimson : "#fff")};
  color: ${({ $primary }) => ($primary ? "#fff" : ink)};
  font: 700 16px ${body};
  text-decoration: none;

  &:hover {
    background: ${({ $primary }) => ($primary ? "#870E33" : sakura)};
  }
`;

const Screen = styled.div`
  position: relative;
  margin-top: 30px;
  padding: 6px;
  background: ${ink};
  clip-path: ${stepped(8)};

  video {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: ${ink};
  }
`;

const Sheet = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
  max-width: 1152px;
  margin: 0 auto;
  padding: 36px 24px 96px;

  @container (min-width: 960px) {
    grid-template-columns: 216px minmax(0, 1fr);
    gap: 56px;
    padding: 56px 56px 120px;
  }
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 20px;
  align-self: start;
  margin: 0;

  @container (min-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    position: sticky;
    top: 28px;
  }
`;

const Fact = styled.div`
  dt {
    color: ${inkSoft};
    font: 500 14px/1.4 ${body};
  }

  dd {
    margin: 2px 0 0;
    font: 700 16px/1.4 ${body};
  }
`;

const Stack = styled.dd``;

const StackList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;

  li {
    padding: 3px 9px;
    background: ${sakura};
    font: 500 14px/1.4 ${body};
  }
`;

const Article = styled.article`
  min-width: 0;
  max-width: 44rem;
`;

const Loading = styled.p`
  color: ${inkSoft};
  font: 500 17px ${body};
`;

export default DocumentPage;
