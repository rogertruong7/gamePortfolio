import { useLayoutEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { bakeChromeFrame } from "./chromeFrameBake.js";

const shimmer = keyframes`
  from {
    background-position: 130% 0, 0 0;
  }
  to {
    background-position: -30% 0, 0 0;
  }
`;

// Goes on the button itself, alongside the ChromeFrame child
export const chromeButton = css`
  font-family: "Pixelify Sans", serif;
  isolation: isolate;
  border: none;
  border-radius: 20px;
  color: #4a4f5c;
  background:
    linear-gradient(
        105deg,
        rgba(190, 198, 212, 0) 28%,
        #bcc4d2 43%,
        #fff 50%,
        #bcc4d2 57%,
        rgba(190, 198, 212, 0) 72%
      )
      no-repeat,
    linear-gradient(#fff, #eef1f6);
  background-size: 300% 100%, 100% 100%;
  background-position: 130% 0, 0 0;

  &:hover {
    animation: ${shimmer} 2.4s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      animation: none;
      background: linear-gradient(#e4e8ef, #d3d8e2);
    }
  }

  &:focus-visible {
    outline: 2px solid white;
    outline-offset: 7px;
  }
`;

const Frame = styled.img`
  position: absolute;
  pointer-events: none;
  z-index: 1;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
`;

const Sheen = styled.span`
  position: absolute;
  pointer-events: none;
  z-index: 1;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background: linear-gradient(
      105deg,
      rgba(255, 255, 255, 0) 42%,
      #fff 50%,
      rgba(255, 255, 255, 0) 58%
    )
    no-repeat;
  background-size: 320% 100%;
  background-position: 110% 0;
  transition: background-position 2s ease-in-out;

  button:hover &,
  button:focus-visible & {
    background-position: -10% 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Measures the button it sits in and wraps it in a matching chrome frame
const ChromeFrame = ({ barbs = true }) => {
  const sheenRef = useRef(null);
  const [frame, setFrame] = useState(null);

  useLayoutEffect(() => {
    const button = sheenRef.current.parentElement;
    const update = () => {
      const { offsetWidth: width, offsetHeight: height } = button;
      if (width && height) setFrame(bakeChromeFrame(width, height, barbs));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(button);
    return () => observer.disconnect();
  }, [barbs]);

  const place = frame && {
    left: -frame.padding,
    top: -frame.padding,
    width: frame.width,
    height: frame.height,
  };

  return (
    <>
      {frame && <Frame src={frame.url} alt="" style={place} />}
      <Sheen
        ref={sheenRef}
        aria-hidden="true"
        style={
          frame
            ? {
                ...place,
                WebkitMaskImage: `url(${frame.url})`,
                maskImage: `url(${frame.url})`,
              }
            : undefined
        }
      />
    </>
  );
};

export default ChromeFrame;
