import { useEffect, useRef, useState } from "react";
import { css, keyframes } from "styled-components";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SLIDE_MS = 450;

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const slideOut = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
`;

// With no document open the game panel sits in the middle of the screen, and with one open it
// sits against the left edge, so this is the distance between those two spots
const CENTRED = "translateX(calc((100vw - 1100px) / 2))";

const panelToLeft = keyframes`
  from { transform: ${CENTRED}; }
  to { transform: translateX(0); }
`;

const panelToCentre = keyframes`
  from { transform: translateX(0); }
  to { transform: ${CENTRED}; }
`;

function slide(name, phase) {
  const easing = phase === "closing" ? "ease-in" : "cubic-bezier(0.22, 0.61, 0.36, 1)";
  return css`
    animation: ${name} ${SLIDE_MS}ms ${easing} both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;
}

// Tracks the document across the phases closed -> opening -> open -> closing -> closed. It's
// kept on screen while it's closing, so it has something to slide out.
export function useDocumentSlide() {
  const [pageToShow, setPageToShow] = useState(null);
  const [phase, setPhase] = useState("closed");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function afterSlide(finish) {
    clearTimeout(timer.current);
    timer.current = setTimeout(finish, REDUCED_MOTION ? 0 : SLIDE_MS);
  }

  function openPage(page) {
    setPageToShow(page);
    // Swapping one open document for another doesn't move the game panel
    if (phase === "closed" || phase === "closing") {
      setPhase("opening");
      afterSlide(() => setPhase("open"));
    }
  }

  function closePage() {
    setPhase("closing");
    afterSlide(() => {
      setPageToShow(null);
      setPhase("closed");
    });
  }

  return { pageToShow, phase, openPage, closePage };
}

// Beside the game panel on a wide screen, and sliding over the top of it otherwise
export const documentSlideStyles = css`
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  ${({ $phase }) => slide($phase === "closing" ? slideOut : slideIn, $phase)}

  @media (max-width: 1700px) {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
`;

// Only a wide screen has the room for the game panel to move aside
export const gamePanelSlideStyles = css`
  @media (min-width: 1701px) {
    ${({ $phase }) => $phase === "opening" && slide(panelToLeft, $phase)}
    ${({ $phase }) => $phase === "closing" && slide(panelToCentre, $phase)}
  }
`;
