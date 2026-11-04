import { Component } from "react";
import styled from "styled-components";
import resume from "../assets/RogerTruongResume.pdf";
import { allEntries } from "../Pages/catalog.js";
import { body, crimson, ink, inkSoft, pixel } from "../UserInterface/Modal.jsx";

// Plain links rather than router links: a full load clears the failure, and the
// project pages don't need the 3D town, so they still work when it can't start.
const Fallback = () => (
  <Page>
    <Inner>
      <h1>The town couldn&apos;t load</h1>
      <p>
        Your browser couldn&apos;t start the 3D part of this site. Everything in
        it is still here.
      </p>
      <Actions>
        <a href={resume} target="_blank" rel="noreferrer" download="RogerTruongResume.pdf">
          Download CV
        </a>
        <button type="button" onClick={() => window.location.assign("/")}>
          Try the town again
        </button>
      </Actions>
      <h2>Projects and experience</h2>
      <ul>
        {allEntries.map((entry) => (
          <li key={entry.path}>
            <a href={entry.path}>{entry.title}</a>
          </li>
        ))}
      </ul>
    </Inner>
  </Page>
);

// Without this, one render error (no WebGL, a failed model download) blanks the site.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

const Page = styled.main`
  position: fixed;
  inset: 0;
  overflow-y: auto;
  background: #f7fbfd;
  color: ${ink};
  font-family: ${body};
`;

const Inner = styled.div`
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 24px;

  h1,
  h2 {
    font-family: ${pixel};
    font-weight: 500;
  }

  h1 {
    margin: 0 0 12px;
    font-size: 2.2rem;
  }

  h2 {
    margin: 40px 0 12px;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    color: ${inkSoft};
    line-height: 1.6;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding: 6px 0;
  }

  a {
    color: ${crimson};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-top: 24px;

  button {
    padding: 8px 14px;
    border: 2px solid ${ink};
    background: none;
    color: ${ink};
    font: inherit;
    cursor: pointer;
  }
`;

export default ErrorBoundary;
