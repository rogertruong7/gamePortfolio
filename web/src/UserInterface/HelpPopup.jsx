import styled from "styled-components";
import ControlsList from "./ControlsList.jsx";
import Modal, { SectionTitle, WIDE_FROM, crimson, inkSoft } from "./Modal.jsx";

const HelpPopup = ({ setShowHelp }) => (
  <Modal
    title="Help"
    tagline="How to get around, and how I made this."
    actionLabel="Keep exploring"
    onClose={() => setShowHelp(false)}
    closeOnBackdrop
    wide
    footer="Roger Truong 2026"
  >
    <Columns>
      <section>
        {/* Not "Controls": Pixelify's capital C reads as an O. */}
        <SectionTitle>Getting around</SectionTitle>
        <ControlsList showReset />
      </section>
      <section>
        <SectionTitle>About this website</SectionTitle>
        <Intro>
          I made the original codebase before agents like Claude Code, with React
          Three Fiber, a React renderer for three.js. It also works on mobile, if
          your device can run it.
        </Intro>
        <Credits>
          <div>
            <dt>Cats</dt>
            <dd>All drawn by me</dd>
          </div>
          <div>
            <dt>3D models</dt>
            <dd>Found online and edited in Blender</dd>
          </div>
          <div>
            <dt>Inspiration</dt>
            <dd>Heavily inspired by Undertale</dd>
          </div>
          <div>
            <dt>Music</dt>
            <dd>From Undertale</dd>
          </div>
          <div>
            <dt>Code</dt>
            <dd>
              <a
                href="https://github.com/rogertruong7/gamePortfolio"
                target="_blank"
                rel="noreferrer"
              >
                See the repository on GitHub
              </a>
            </dd>
          </div>
        </Credits>
      </section>
    </Columns>
  </Modal>
);

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;

  @media (min-width: ${WIDE_FROM}px) {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    gap: 48px;
  }
`;

const Intro = styled.p`
  margin: 0 0 20px;
  max-width: 34em;
`;

const Credits = styled.dl`
  display: grid;
  gap: 12px;
  margin: 0;

  & > div {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 2px 16px;
  }

  dt {
    color: ${inkSoft};
    font-weight: 500;
  }

  dd {
    margin: 0;
    font-weight: 700;
  }

  a {
    color: ${crimson};
    text-underline-offset: 4px;
  }

  @container (max-width: 360px) {
    & > div {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;

export default HelpPopup;
