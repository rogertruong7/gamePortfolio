import { useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { RESUME_NAME, RESUME_URL } from "../Helpers/resume.js";
import MuteButton from "./MuteButton.jsx";
import ContactPopup from "./ContactPopup.jsx";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import PlayerCount from "./PlayerCount.jsx";
import { NARROW_HUD } from "./hudCorner.js";

// Styled components for Menu and Button
const MenuContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  top: 10px;
  right: 20px;
  z-index: 106;
`;

const MenuRow = styled.div`
  display: flex;
`;
const dropIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// The links drop down under the menu button as a column of the same chrome buttons
const SmallMenuContainer = styled.nav`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  top: 78px;
  right: 15px;
  z-index: 140;

  & > * {
    animation: ${dropIn} 180ms ease-out both;
  }

  ${[1, 2, 3, 4, 5, 6].map(
    (n) => css`
      & > :nth-child(${n}) {
        animation-delay: ${(n - 1) * 40}ms;
      }
    `
  )}

  @media (prefers-reduced-motion: reduce) {
    & > * {
      animation: none;
    }
  }
`;

const DefaultButton = styled.button`
  ${chromeButton}
  position: relative;
  padding: 10px 15px;
  margin: 0 5px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  width: 130px;
`;

// Only on phones, where the chat and its new room button are folded away
const NewRoomButton = styled(DefaultButton)`
  @media not all and ${NARROW_HUD} {
    display: none;
  }
`;

const HamburgerMenuButton = styled.button`
  ${chromeButton}
  position: absolute;
  top: 17px;
  right: 20px;
  z-index: 140;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  /* Three bars that cross into an X while the menu is open */
  span {
    width: 18px;
    height: 3px;
    border-radius: 2px;
    background-color: currentColor;
    transition: transform 180ms ease, opacity 180ms ease;
  }

  &[aria-expanded="true"] span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }

  &[aria-expanded="true"] span:nth-child(2) {
    opacity: 0;
  }

  &[aria-expanded="true"] span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }

  @media (min-width: 1100px) {
    display: none;
  }
`;

const LINKS = [
  { label: "github", href: "https://github.com/rogertruong7", external: true },
  { label: "linkedin", href: "https://www.linkedin.com/in/roger-truong/", external: true },
  { label: "download cv", href: RESUME_URL, download: RESUME_NAME },
];

const Links = ({ onPick }) =>
  LINKS.map(({ label, href, external, download }) => (
    <a
      key={label}
      href={href}
      target="_blank"
      rel={external ? "noopener noreferrer" : undefined}
      download={download}
      onClick={onPick}
    >
      <DefaultButton tabIndex={-1}>
        {label}
        <ChromeFrame spikes={false} />
      </DefaultButton>
    </a>
  ));

const Menu = ({ room, onPlay, onCreateRoom, onLeaveRoom }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [lessThan1100, setLessThan1100] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const handleResize = (e) => setLessThan1100(e.matches);
    setLessThan1100(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  // Closes on a tap anywhere else, or Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (toggleRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <>
      <HamburgerMenuButton
        ref={toggleRef}
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label="Menu"
        aria-expanded={isMenuOpen}
      >
        <span />
        <span />
        <span />
        <ChromeFrame spikes={false} />
      </HamburgerMenuButton>
      {!lessThan1100 && (
        <MenuContainer>
          <MenuRow>
            <Links />
            <DefaultButton onClick={() => setShowContact(true)}>
              contact
              <ChromeFrame spikes={false} />
            </DefaultButton>
            <MuteButton />
          </MenuRow>
        </MenuContainer>
      )}
      {lessThan1100 && isMenuOpen && (
        <SmallMenuContainer ref={menuRef} aria-label="Links">
          {room && (
            <PlayerCount
              room={room}
              where="menu"
              onPlay={(player) => {
                setIsMenuOpen(false);
                onPlay?.(player);
              }}
              onLeaveRoom={() => {
                setIsMenuOpen(false);
                onLeaveRoom?.();
              }}
            />
          )}
          {room && onCreateRoom && (
            <NewRoomButton
              onClick={() => {
                setIsMenuOpen(false);
                onCreateRoom();
              }}
            >
              new room
              <ChromeFrame spikes={false} />
            </NewRoomButton>
          )}
          <Links onPick={() => setIsMenuOpen(false)} />
          <DefaultButton
            onClick={() => {
              setIsMenuOpen(false);
              setShowContact(true);
            }}
          >
            contact
            <ChromeFrame spikes={false} />
          </DefaultButton>
          <MuteButton />
        </SmallMenuContainer>
      )}
      {showContact && <ContactPopup onClose={() => setShowContact(false)} />}
    </>
  );
};

export default Menu;
