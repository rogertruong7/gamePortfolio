import { Link } from "react-router-dom";
import styled from "styled-components";

const Privacy = () => (
  <Page>
    <Content>
      <Title>Privacy</Title>
      <p>
        This site records visits so I can see how people find it and which parts
        they look at. It has no adverts and I don&apos;t sell this data.
      </p>

      <Heading>What gets recorded</Heading>
      <ul>
        <li>
          Your IP address, and the approximate location and network owner that
          come from it
        </li>
        <li>
          Your browser, device, operating system, screen size, language and time
          zone
        </li>
        <li>The website or tagged link that brought you here</li>
        <li>
          The buildings and pages you open, links you click, whether you
          download my CV, and how long you stay
        </li>
        <li>
          A random ID kept in your browser&apos;s storage, so a repeat visit can
          be recognised
        </li>
      </ul>

      <Heading>Who sees it</Heading>
      <p>
        Only me, on a password-protected page. It is stored with Neon and the
        site is hosted by Vercel. Your IP address is also sent to ipwho.is to
        find out which network it belongs to.
      </p>

      <Heading>Your choices</Heading>
      <p>
        Clearing this site&apos;s data in your browser removes the random ID. To
        ask me to delete anything recorded about you, message me on{" "}
        <a
          href="https://www.linkedin.com/in/roger-truong/"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        .
      </p>

      <Link to="/">Back to the game</Link>
    </Content>
  </Page>
);

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow: auto;
  background-color: rgb(36, 36, 36);
  color: #eee;
  font-family: "Open Sans", sans-serif;
  line-height: 1.6;
  user-select: text;

  a {
    color: #ffc58a;
  }
`;

const Content = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px;
`;

const Title = styled.h1`
  font-family: "Pixelify Sans", serif;
  font-size: 2.5rem;
  margin: 0 0 16px;
`;

const Heading = styled.h2`
  font-family: "Pixelify Sans", serif;
  font-size: 1.4rem;
  margin: 32px 0 8px;
`;

export default Privacy;
