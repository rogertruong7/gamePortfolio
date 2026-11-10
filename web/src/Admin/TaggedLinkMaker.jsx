import { useState } from "react";
import styled from "styled-components";
import { color, PixelButton, Quiet, TextField } from "./theme.js";

const toTag = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const TaggedLinkMaker = () => {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const tag = toTag(name);
  const link = tag ? `${window.location.origin}/?ref=${tag}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };

  return (
    <div>
      <Quiet>
        Use a different link for each company or site, and their visits will be
        labelled with that name. LinkedIn&apos;s app usually hides where a visit
        came from, so this is the reliable way to spot it.
      </Quiet>
      <Controls>
        <label htmlFor="tag-name">Who is this link for?</label>
        <TextField
          id="tag-name"
          value={name}
          placeholder="linkedin, atlassian, canva"
          onChange={(event) => {
            setName(event.target.value);
            setCopied(false);
          }}
        />
        <PixelButton type="button" disabled={!link} onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </PixelButton>
      </Controls>
      {link && <LinkPreview>{link}</LinkPreview>}
    </div>
  );
};

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: 0.875rem;
`;

const LinkPreview = styled.p`
  margin: 10px 0 0;
  font-size: 0.875rem;
  color: ${color.lantern};
  overflow-wrap: anywhere;
`;

export default TaggedLinkMaker;
