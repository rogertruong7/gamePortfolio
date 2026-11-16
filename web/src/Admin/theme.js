import styled, { css } from "styled-components";

// A plain light theme: this page is for reading numbers, not for the game look.
export const color = {
  page: "#f7f6f2",
  surface: "#ffffff",
  line: "#e3e1da",
  lineStrong: "#c9c6bc",
  ink: "#1d1f23",
  muted: "#585d66",
  accent: "#8a4b00",
  bar: "#c47a12",
  barSoft: "#f1e4cf",
  danger: "#a3261b",
};

export const fontStack = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

export const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${color.accent};
    outline-offset: 2px;
  }
`;

export const Panel = styled.section`
  min-width: 0;
`;

export const PanelTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 650;
  margin: 0 0 12px;
  color: ${color.ink};
`;

export const Quiet = styled.p`
  margin: 0;
  color: ${color.muted};
  font-size: 0.9375rem;
`;

export const Button = styled.button`
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  color: ${({ $active }) => ($active ? "#fff" : color.ink)};
  background-color: ${({ $active }) => ($active ? color.ink : color.surface)};
  border: 1px solid ${({ $active }) => ($active ? color.ink : color.lineStrong)};
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: ${color.ink};
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }

  ${focusRing}
`;

export const LinkButton = styled.button`
  font: inherit;
  font-size: 0.875rem;
  color: ${({ $danger }) => ($danger ? color.danger : color.accent)};
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }

  ${focusRing}
`;

export const TextField = styled.input`
  font: inherit;
  font-size: 0.9375rem;
  color: ${color.ink};
  background-color: ${color.surface};
  border: 1px solid ${color.lineStrong};
  border-radius: 4px;
  padding: 6px 10px;
  min-width: 0;

  &::placeholder {
    color: #80858d;
  }

  &:focus-visible {
    outline: 2px solid ${color.accent};
    outline-offset: -1px;
  }
`;

export const ErrorText = styled.p`
  margin: 8px 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${color.danger};
`;
