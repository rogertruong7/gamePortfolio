import { useRef, useState } from "react";
import styled from "styled-components";
import { ROOM_SIZE } from "../Multiplayer/room.js";
import { ChatIcon, PeopleIcon, ShirtIcon } from "./HudIcons.jsx";
import {
  Chip,
  Key,
  List,
  MouseIcon,
  Row,
  WalkKeys,
  WideKey,
  useTouchOnly,
} from "./ControlsList.jsx";
import Modal, { PHONE, SectionTitle, WIDE_FROM, crimson, ink, inkSoft, pixel } from "./Modal.jsx";

const ControlsTab = ({ touchOnly }) => (
  <Columns>
    <section>
      {/* Not "Controls": Pixelify's capital C reads as an O. */}
      <SectionTitle>Getting around</SectionTitle>
      {touchOnly ? (
        <List>
          <Row input={<Chip round>tap</Chip>} title="Walk">
            Tap the ground where you want to go.
          </Row>
          <Row input={<Chip round>camera</Chip>} title="Camera">
            It follows you as you walk, and swings back to the front when you stop.
          </Row>
          <Row input={<Chip>buttons</Chip>} title="Go in, sit down, jump in">
            When you reach a door, a bench or the pond, a button pops up. Tap it.
          </Row>
          <Row input={<Chip>reset</Chip>} title="Start again">
            Puts you back where you started.
          </Row>
        </List>
      ) : (
        <List>
          <Row input={<WalkKeys />} title="Walk">
            Up always walks away from the camera.
          </Row>
          <Row
            input={
              <Chip round>
                <MouseIcon />
                click
              </Chip>
            }
            title="Walk to a spot"
          >
            Click anywhere on the ground.
          </Row>
          <Row
            input={
              <Chip round>
                <MouseIcon />
                hold and drag
              </Chip>
            }
            title="Camera"
          >
            Drag to look around. It swings back to the front after a few seconds.
          </Row>
          <Row input={<WideKey>space</WideKey>} title="Jump" />
          <Row input={<Chip>reset</Chip>} title="Start again">
            Puts you back where you started.
          </Row>
        </List>
      )}
    </section>
    <section>
      <SectionTitle>{touchOnly ? "Buttons" : "Keys"}</SectionTitle>
      {touchOnly ? (
        <List>
          <Row input={<Chip>home</Chip>} title="Leave a building">
            Top left, inside any building.
          </Row>
          <Row input={<Chip>emote</Chip>} title="Emotes">
            Wave, dance and more.
          </Row>
          <Row
            input={
              <Chip>
                <ChatIcon size={18} />
                chat
              </Chip>
            }
            title="Chat"
          >
            Bottom left. Talk to everyone in your town.
          </Row>
          <Row
            input={
              <Chip>
                <ShirtIcon size={18} />
              </Chip>
            }
            title="Wardrobe"
          >
            Change how your character looks.
          </Row>
        </List>
      ) : (
        <List>
          <Row input={<Keys keys={["E", "Z"]} />} title="Go in, sit down, pick">
            Does what the button on screen offers. Space and Enter work too in buildings.
          </Row>
          <Row input={<Keys keys={["Esc"]} />} title="Leave a building">
            Or press home in the top left.
          </Row>
          <Row input={<Keys keys={["B"]} />} title="Emote wheel">
            Point at an emote and click.
          </Row>
          <Row input={<Keys keys={["Enter"]} />} title="Chat">
            Start typing to everyone in your town.
          </Row>
          <Row input={<Keys keys={["G"]} />} title="Games">
            While you&apos;re sitting on a bench.
          </Row>
        </List>
      )}
    </section>
  </Columns>
);

const Keys = ({ keys }) => (
  <KeyRow>
    {keys.map((key, index) => (
      <span key={key}>
        {index > 0 && <Or>or</Or>}
        <Key>{key}</Key>
      </span>
    ))}
  </KeyRow>
);

const BUILDINGS = [
  {
    name: "about me",
    text: "Who I am, told by one of my cats. Click, tap or press Space to keep it going.",
  },
  {
    name: "projects",
    text: "A library of everything I've built. Pick one to open its page: what it does, how I made it, and a demo film for most.",
  },
  {
    name: "experience",
    text: "The jobs I've had and what I did in each, in the same kind of book.",
  },
  {
    name: "skills",
    text: "The languages, frameworks and tools I use.",
  },
];

const BuildingsTab = ({ touchOnly }) => (
  <Columns>
    <section>
      <SectionTitle>What&apos;s inside</SectionTitle>
      <Places>
        {BUILDINGS.map((building) => (
          <div key={building.name}>
            <dt>{building.name}</dt>
            <dd>{building.text}</dd>
          </div>
        ))}
      </Places>
    </section>
    <section>
      <SectionTitle>Going in and out</SectionTitle>
      <Steps>
        <li>Walk up to a building&apos;s door. Its name floats above it.</li>
        <li>
          {touchOnly
            ? "Tap the Enter button that pops up."
            : "Press E, or click the Enter button that pops up."}
        </li>
        <li>
          {touchOnly
            ? "In the projects or experience book, tap an entry. The arrows turn the page."
            : "In the projects or experience book, pick an entry with the arrow keys and press Enter, or click it."}
        </li>
        <li>
          {touchOnly
            ? "Press home in the top left to go back outside."
            : "Press home in the top left, or Escape, to go back outside."}
        </li>
      </Steps>
      <Note>Every project and job has its own link, so you can send one to someone.</Note>
    </section>
  </Columns>
);

const TownTab = ({ touchOnly }) => (
  <Columns>
    <section>
      <SectionTitle>Other people</SectionTitle>
      <Places>
        <div>
          <dt>
            <PeopleIcon size={18} /> Visitors
          </dt>
          <dd>
            Up to {ROOM_SIZE} people share a town and see each other. When it&apos;s full, the
            next visitors get a town of their own. The count is in the{" "}
            {touchOnly ? "menu" : "top left"}.
          </dd>
        </div>
        <div>
          <dt>Private rooms</dt>
          <dd>
            Press new room ({touchOnly ? "in the menu" : "above the chat"}) for a town with a
            four-letter code. Send the link to friends to play together.
          </dd>
        </div>
        <div>
          <dt>
            <ChatIcon size={18} /> Chat
          </dt>
          <dd>
            {touchOnly
              ? "Tap the chat button in the bottom left."
              : "Press Enter to start typing."}{" "}
            Everyone in your town sees it.
          </dd>
        </div>
        <div>
          <dt>Emotes</dt>
          <dd>{touchOnly ? "Tap the emote button." : "Press B or the emote button."}</dd>
        </div>
        <div>
          <dt>
            <ShirtIcon size={18} /> Wardrobe
          </dt>
          <dd>
            Hair, outfit, hats and more. Others see your look, and it&apos;s saved on this device.
          </dd>
        </div>
      </Places>
    </section>
    <section>
      <SectionTitle>Things to do</SectionTitle>
      <Places>
        <div>
          <dt>Benches</dt>
          <dd>
            Sit down on one. If someone sits next to you, &ldquo;Play games&rdquo;
            {touchOnly ? "" : " (or G)"} has 15 two-player games, like Connect Four, Pool and Mini
            Golf. You can also invite anyone from the player list.
          </dd>
        </div>
        <div>
          <dt>Arcade</dt>
          <dd>
            Block Drop, Doubles and Fox Run, to play on your own. Open them from the menu, or sit on
            a bench by yourself.
          </dd>
        </div>
        <div>
          <dt>The pond</dt>
          <dd>Wade in and see what happens.</dd>
        </div>
      </Places>
    </section>
  </Columns>
);

const AboutTab = () => (
  <Columns>
    <section>
      <SectionTitle>How I made it</SectionTitle>
      <Intro>
        I made the original codebase before agents like Claude Code, with React Three Fiber, a
        React renderer for three.js. It also works on phones, if yours can run it.
      </Intro>
      <Intro>
        <a href="/privacy" target="_blank" rel="noreferrer">
          What this site records about visits
        </a>
      </Intro>
    </section>
    <section>
      {/* Not "Credits": Pixelify's capital C reads as an O. */}
      <SectionTitle>Thanks</SectionTitle>
      <Places>
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
      </Places>
    </section>
  </Columns>
);

const TABS = [
  { id: "controls", label: "Controls", Panel: ControlsTab },
  { id: "buildings", label: "Buildings", Panel: BuildingsTab },
  { id: "town", label: "Town", Panel: TownTab },
  { id: "about", label: "About", Panel: AboutTab },
];

const HelpPopup = ({ setShowHelp }) => {
  const touchOnly = useTouchOnly();
  const [tab, setTab] = useState(TABS[0].id);
  const tabRefs = useRef({});
  const { Panel } = TABS.find((option) => option.id === tab);

  // Left and right move between the tabs, as in any tab list
  const onTabKey = (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = TABS.findIndex((option) => option.id === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Modal
      title="Help"
      tagline="How to get around, what's in each building, and what else there is to do."
      taglineOnPhones={false}
      actionLabel="Keep exploring"
      onClose={() => setShowHelp(false)}
      closeOnBackdrop
      wide={1180}
      footer="Roger Truong 2026"
    >
      <TabList role="tablist" aria-label="Help topics" onKeyDown={onTabKey}>
        {TABS.map((option) => (
          <TabButton
            key={option.id}
            ref={(element) => {
              tabRefs.current[option.id] = element;
            }}
            id={`help-tab-${option.id}`}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            aria-controls="help-panel"
            tabIndex={tab === option.id ? 0 : -1}
            onClick={() => setTab(option.id)}
          >
            {option.label}
          </TabButton>
        ))}
      </TabList>
      <TabPanel id="help-panel" role="tabpanel" aria-labelledby={`help-tab-${tab}`}>
        <Panel touchOnly={touchOnly} />
      </TabPanel>
    </Modal>
  );
};

const TabList = styled.div`
  display: flex;
  gap: 4px 28px;
  margin: -6px 0 28px;
  border-bottom: 2px solid rgba(20, 35, 90, 0.12);
  overflow-x: auto;
  scrollbar-width: none;

  @media ${PHONE} {
    gap: 20px;
    margin-bottom: 20px;
  }
`;

const TabButton = styled.button`
  flex: none;
  margin-bottom: -2px;
  padding: 6px 0 10px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: ${inkSoft};
  font: 500 20px / 1.1 ${pixel};
  cursor: pointer;

  &:hover {
    color: ${ink};
  }

  &[aria-selected="true"] {
    color: ${ink};
    border-bottom-color: ${crimson};
  }

  @media ${PHONE} {
    font-size: 16px;
  }
`;

// The same height for every tab, so switching doesn't make the popup jump about
const TabPanel = styled.div`
  min-height: min(470px, 52dvh);
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;

  @media (min-width: ${WIDE_FROM}px) {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 56px;
  }

  @media ${PHONE} {
    gap: 26px;
  }
`;

const KeyRow = styled.span`
  display: flex;
  align-items: center;

  & > span {
    display: flex;
    align-items: center;
  }
`;

const Or = styled.span`
  margin: 0 10px;
  color: ${inkSoft};
  font-weight: 500;
`;

const Places = styled.dl`
  display: grid;
  gap: 16px;
  margin: 0;

  /* The body font, as the pixel one turns names like "Chat" into "Ohat" */
  dt {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
    color: ${ink};
    font-weight: 700;
  }

  dd {
    margin: 0;
    color: ${inkSoft};
  }

  a {
    color: ${crimson};
    text-underline-offset: 4px;
  }

  @media ${PHONE} {
    gap: 14px;
  }
`;

const Steps = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 1.4em;

  li::marker {
    color: ${crimson};
    font-weight: 700;
  }
`;

const Note = styled.p`
  margin: 18px 0 0;
  color: ${inkSoft};
`;

const Intro = styled.p`
  margin: 0 0 16px;
  max-width: 34em;

  a {
    color: ${crimson};
    text-underline-offset: 4px;
  }
`;

export default HelpPopup;
