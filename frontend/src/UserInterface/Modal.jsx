import { useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import "@fontsource/zen-kaku-gothic-new/500.css";
import "@fontsource/zen-kaku-gothic-new/700.css";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";

// The same palette and type as the project pages (Pages/DocumentPage.jsx).
export const ink = "#14235A";
export const inkSoft = "#46557F";
export const crimson = "#A8123F";
// The blue from the loading bar's gel blocks. The action button takes focus on open, so this
// ring can show as soon as the popup appears, and it reads as "this is the default button".
export const focusBlue = "#1F7FD6";
const sky = "#86CDEB";
const paper = "#F7FBFD";
export const body = '"Zen Kaku Gothic New", "Hiragino Sans", system-ui, sans-serif';
export const pixel = '"Pixelify Sans", "Zen Kaku Gothic New", sans-serif';

// A native <dialog> keeps focus inside and sits above the HUD buttons.
const Modal = ({
  title,
  tagline,
  actionLabel,
  onClose,
  closeOnBackdrop = false,
  wide = false,
  footer,
  children,
}) => {
  const dialogRef = useRef(null);
  const actionRef = useRef(null);

  useLayoutEffect(() => {
    dialogRef.current.showModal();
    actionRef.current.focus();
  }, []);

  return (
    <Shell
      ref={dialogRef}
      $wide={wide}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Otherwise the game hears these keys and walks the player around behind the popup.
      onKeyDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <Card>
        <Inner>
          <Head>
            <Title id="modal-title">{title}</Title>
            {tagline && <Tagline>{tagline}</Tagline>}
          </Head>
          <Content>{children}</Content>
          <Foot>
            <FootNote>{footer}</FootNote>
            <ActionButton ref={actionRef} type="button" onClick={onClose}>
              {actionLabel}
              <ChromeFrame />
            </ActionButton>
          </Foot>
        </Inner>
        <ChromeFrame spikeScale={2} />
      </Card>
    </Shell>
  );
};

const MAX_HEIGHT = "calc(100dvh - 64px)";
export const WIDE_FROM = 1060;

const Shell = styled.dialog`
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  width: min(580px, calc(100vw - 56px));
  max-width: none;
  height: fit-content;
  max-height: ${MAX_HEIGHT};
  margin: auto;
  padding: 0;
  border: 0;
  overflow: visible;
  background: none;
  color: ${ink};
  font-family: ${body};
  cursor: default;

  @media (min-width: ${WIDE_FROM}px) {
    width: ${({ $wide }) => ($wide ? "980px" : "580px")};
  }

  &::backdrop {
    background: rgba(11, 22, 64, 0.62);
  }

  & *,
  & *::before,
  & *::after {
    box-sizing: border-box;
  }

  & :focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 3px;
  }
`;

// The chrome frame measures this element and wraps around it.
const Card = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  max-height: ${MAX_HEIGHT};
  border-radius: 20px;
`;

const Inner = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 20px;
  background: ${paper};
`;

const Head = styled.header`
  flex: none;
  padding: 30px 32px 24px;
  background: ${sky};

  @media (max-width: 520px) {
    padding: 26px 22px 20px;
  }
`;

const Title = styled.h2`
  margin: 0;
  font: 600 clamp(34px, 7vw, 46px) / 1.05 ${pixel};
  letter-spacing: -0.01em;
`;

const Tagline = styled.p`
  margin: 8px 0 0;
  font: 500 18px / 1.45 ${body};
`;

const Content = styled.div`
  container-type: inline-size;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 26px 32px 28px;
  font: 500 17px / 1.55 ${body};
  user-select: text;
  scrollbar-color: ${ink} ${paper};

  @media (max-width: 520px) {
    padding: 22px 22px 24px;
  }
`;

const Foot = styled.footer`
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px 24px;
  padding: 20px 32px 24px;
  border-top: 2px solid rgba(20, 35, 90, 0.12);

  @media (max-width: 520px) {
    padding: 18px 22px 22px;
  }
`;

const FootNote = styled.div`
  flex: 1 1 220px;
  min-width: 0;
  color: ${inkSoft};
  font: 500 15px / 1.4 ${body};
`;

const ActionButton = styled.button`
  ${chromeButton}
  position: relative;
  flex: none;
  min-width: 170px;
  padding: 13px 26px;
  color: ${ink};
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid ${focusBlue};
    outline-offset: 6px;
  }

  @media (max-width: 520px) {
    width: 100%;
  }
`;

export const SectionTitle = styled.h3`
  margin: 0 0 18px;
  font: 600 26px / 1.15 ${pixel};
`;

export default Modal;
