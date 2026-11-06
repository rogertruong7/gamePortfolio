import { useState, useEffect } from "react";
import styled, { css, keyframes } from "styled-components";
import { track } from "../Analytics/tracker.js";

const PER_PAGE = 4;
const PER_SIDE = 2;
// Below this the book closes to a single page with all four entries on it
const SINGLE_PAGE_QUERY = "(max-width: 650px)";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// What goes under an entry's title: a project's kind, or the job an experience was
function subtitle(entry) {
  if (entry.kind === "experience") return entry.option.split(" - ").slice(1).join(" - ");
  return entry.category;
}

function useSinglePage() {
  const [singlePage, setSinglePage] = useState(() => window.matchMedia(SINGLE_PAGE_QUERY).matches);
  useEffect(() => {
    const mediaQuery = window.matchMedia(SINGLE_PAGE_QUERY);
    const onChange = (e) => setSinglePage(e.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);
  return singlePage;
}

// The menu reads like the contents of an open book: two entries on the left page, two on the
// right, and the arrows turn to the next spread. Entries are the catalog's, four to a spread.
// `active` is false while a page is open over the menu, so its keys stay with that page.
const OptionSelector = ({ setPageToShow, entries, section, active }) => {
  const [spread, setSpread] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Which way the last page turn went, so the new page swings in from the right side
  const [turn, setTurn] = useState(null);
  const singlePage = useSinglePage();

  const spreadCount = Math.ceil(entries.length / PER_PAGE);
  const onSpread = entries.slice(spread * PER_PAGE, (spread + 1) * PER_PAGE);
  const lastIndex = onSpread.length - 1;

  const turnTo = (next, index) => {
    if (next < 0 || next >= spreadCount) return;
    const count = Math.min(PER_PAGE, entries.length - next * PER_PAGE);
    setTurn(next > spread ? "forward" : "back");
    setSpread(next);
    setSelectedIndex(Math.min(index, count - 1));
  };

  const open = (index) => {
    const entry = onSpread[index];
    if (!entry) return;
    track("open_item", `${section}: ${entry.option}`);
    setPageToShow(spread * PER_PAGE + index + 1);
  };

  // On one page the entries run straight down. On two, up and down stay on a page, and left and
  // right cross the spine, turning the page at either edge.
  const move = (direction) => {
    const column = Math.floor(selectedIndex / PER_SIDE);
    const row = selectedIndex % PER_SIDE;
    if (singlePage) {
      if (direction === "left") turnTo(spread - 1, 0);
      if (direction === "right") turnTo(spread + 1, 0);
      if (direction === "up") {
        if (selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
        else turnTo(spread - 1, PER_PAGE - 1);
      }
      if (direction === "down") {
        if (selectedIndex < lastIndex) setSelectedIndex(selectedIndex + 1);
        else turnTo(spread + 1, 0);
      }
      return;
    }
    if (direction === "up" && row > 0) setSelectedIndex(selectedIndex - 1);
    if (direction === "down" && row < PER_SIDE - 1 && selectedIndex < lastIndex) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (direction === "left") {
      if (column === 1) setSelectedIndex(row);
      else turnTo(spread - 1, PER_SIDE + row);
    }
    if (direction === "right") {
      if (column === 0 && lastIndex >= PER_SIDE) setSelectedIndex(Math.min(PER_SIDE + row, lastIndex));
      else if (column === 1 || lastIndex < PER_SIDE) turnTo(spread + 1, row);
    }
  };

  useEffect(() => {
    if (!active) return;
    const KEYS = {
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
    };
    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        open(selectedIndex);
        return;
      }
      const direction = KEYS[e.key.toLowerCase()];
      if (!direction) return;
      e.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const sides = singlePage ? [onSpread] : [onSpread.slice(0, PER_SIDE), onSpread.slice(PER_SIDE)];
  const firstPageNumber = spread * (singlePage ? 1 : 2) + 1;

  return (
    <Book>
      <Pages $singlePage={singlePage}>
        {sides.map((side, sideIndex) => (
          <Page
            key={`${spread}-${sideIndex}`}
            $side={sideIndex === 0 ? "left" : "right"}
            $turn={REDUCED_MOTION ? null : turn}
          >
            {side.map((entry, i) => {
              const index = sideIndex * PER_SIDE + i;
              const selected = selectedIndex === index;
              return (
                <Entry
                  key={entry.slug}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(index)}
                  onFocus={() => setSelectedIndex(index)}
                  onClick={() => open(index)}
                  aria-current={selected}
                >
                  <SoulSlot aria-hidden="true">{selected && <Soul />}</SoulSlot>
                  <EntryText>
                    <TitleLine>
                      <Title>{entry.title}</Title>
                      <Leader aria-hidden="true" />
                      <Period>{entry.period}</Period>
                    </TitleLine>
                    <Subtitle>{subtitle(entry)}</Subtitle>
                  </EntryText>
                </Entry>
              );
            })}
          </Page>
        ))}
      </Pages>
      <Footer $singlePage={singlePage}>
        <FooterSide>
          <TurnButton
            type="button"
            onClick={() => turnTo(spread - 1, 0)}
            disabled={spread === 0}
            aria-label="Previous page"
          >
            &#9664;
          </TurnButton>
          <PageNumber>
            {singlePage ? `page ${spread + 1} / ${spreadCount}` : `- ${firstPageNumber} -`}
          </PageNumber>
          {singlePage && (
            <TurnButton
              type="button"
              onClick={() => turnTo(spread + 1, 0)}
              disabled={spread === spreadCount - 1}
              aria-label="Next page"
            >
              &#9654;
            </TurnButton>
          )}
        </FooterSide>
        {!singlePage && (
          <FooterSide $right>
            <span aria-hidden="true" />
            <PageNumber>{`- ${firstPageNumber + 1} -`}</PageNumber>
            <TurnButton
              type="button"
              onClick={() => turnTo(spread + 1, 0)}
              disabled={spread === spreadCount - 1}
              aria-label="Next page"
            >
              &#9654;
            </TurnButton>
          </FooterSide>
        )}
      </Footer>
    </Book>
  );
};

// Undertale's red SOUL, the cursor beside whichever entry is picked
const Soul = () => (
  <svg viewBox="0 0 7 6" shapeRendering="crispEdges" width="100%" height="100%">
    <path
      fill="#ff0000"
      d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"
    />
  </svg>
);

const turnFromSpine = keyframes`
  from { transform: perspective(1200px) rotateY(var(--turn-from)); opacity: 0; }
  to { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
`;

const Book = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 2px solid white;
  border-radius: 4px;
  /* The edges of the pages underneath */
  box-shadow:
    0 4px 0 -1px black,
    0 5px 0 0 #8a8a8a,
    0 9px 0 -1px black,
    0 10px 0 0 #4a4a4a;
  margin-bottom: 10px;
`;

const Pages = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: ${({ $singlePage }) => ($singlePage ? "1fr" : "1fr 1fr")};
`;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(10px, 3.5vh, 36px);
  min-width: 0;
  padding: clamp(8px, 1.6vw, 24px) clamp(8px, 2vw, 32px);
  transform-origin: ${({ $side }) => ($side === "left" ? "right" : "left")} center;

  /* The spine: a double line down the middle */
  ${({ $side }) =>
    $side === "right" &&
    css`
      border-left: 6px double white;
    `}

  /* Pages turning forward swing in from the right, and back from the left */
  ${({ $turn, $side }) =>
    $turn &&
    css`
      --turn-from: ${$side === "left" ? "70deg" : "-70deg"};
      animation: ${turnFromSpine} 260ms ease-out both;
      animation-delay: ${($turn === "forward") === ($side === "left") ? "0ms" : "90ms"};
    `}
`;

const Entry = styled.button`
  display: flex;
  align-items: flex-start;
  gap: clamp(6px, 1vw, 14px);
  width: 100%;
  padding: 4px 0;
  border: 0;
  background: none;
  color: white;
  text-align: left;
  font-family: "Determination Mono", "Pixelify Sans", serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px dashed white;
    outline-offset: 4px;
  }
`;

const SoulSlot = styled.span`
  flex-shrink: 0;
  width: clamp(14px, 1.6vw, 22px);
  height: clamp(12px, 1.4vw, 19px);
  /* Sits level with the middle of the title's first line */
  margin-top: calc((1.25em - clamp(12px, 1.4vw, 19px)) / 2);
  font-size: clamp(1.05rem, 0.8rem + 0.85vw, 1.7rem);
`;

const EntryText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
`;

const TitleLine = styled.span`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: clamp(1.05rem, 0.8rem + 0.85vw, 1.7rem);
  line-height: 1.25;
`;

const Title = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

// The row of dots that leads from a title to its date, as in a book's contents
const Leader = styled.span`
  flex: 1;
  min-width: 12px;
  border-bottom: 3px dotted #8a8a8a;
  transform: translateY(-0.2em);
`;

const Period = styled.span`
  flex-shrink: 0;
  font-size: 0.7em;
  color: #cfcfcf;
  white-space: nowrap;
`;

const Subtitle = styled.span`
  font-size: clamp(0.72rem, 0.62rem + 0.35vw, 1rem);
  color: #9a9a9a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const Footer = styled.div`
  display: grid;
  grid-template-columns: ${({ $singlePage }) => ($singlePage ? "1fr" : "1fr 1fr")};
  border-top: 2px solid white;
`;

// A page's number in the middle, with the arrow that turns it on its outside edge
const FooterSide = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 2px 8px 4px;

  & > :first-child {
    justify-self: start;
  }

  & > :last-child {
    justify-self: end;
  }

  ${({ $right }) =>
    $right &&
    css`
      border-left: 6px double white;
    `}
`;

const PageNumber = styled.span`
  font-family: "Determination Mono", "Pixelify Sans", serif;
  font-size: clamp(0.8rem, 0.7rem + 0.3vw, 1rem);
  color: #9a9a9a;
  white-space: nowrap;
`;

const TurnButton = styled.button`
  padding: 2px 10px;
  border: 2px solid transparent;
  border-radius: 6px;
  background: none;
  color: #9a9a9a;
  font-size: clamp(1rem, 0.8rem + 0.6vw, 1.5rem);
  cursor: pointer;

  &:hover:not(:disabled),
  &:focus-visible {
    border-color: white;
    color: white;
    outline: none;
  }

  &:disabled {
    visibility: hidden;
  }
`;

export default OptionSelector;
