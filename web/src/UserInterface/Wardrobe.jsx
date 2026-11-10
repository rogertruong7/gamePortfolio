import { lazy, Suspense, useId, useState } from "react";
import styled from "styled-components";
import ChromeFrame, { chromeButton } from "./ChromeFrame.jsx";
import Modal, { WIDE_FROM, body, focusBlue, ink, inkSoft, paper, pixel } from "./Modal.jsx";
import { ExtraIcon, HairIcon, OutfitIcon } from "./wardrobeIcons.jsx";
import {
  BODIES,
  BODY_PRESETS,
  DEFAULT_LOOK,
  EXTRAS,
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_STYLES,
  OUTFITS,
  OUTFIT_COLOURS,
  SKIN_TONES,
  randomLook,
} from "../Game/look/lookOptions.js";

// Its canvas only loads once the wardrobe is opened
const WardrobePreview = lazy(() => import("./WardrobePreview.jsx"));

const TABS = [
  { id: "body", label: "Body" },
  { id: "hair", label: "Hair" },
  { id: "outfit", label: "Outfit" },
  { id: "extras", label: "Extras" },
];

// One choice from a row of options, each a tile or a colour. Arrow keys move between them, like
// any group of radio buttons.
const Choices = ({ label, options, value, onChange, swatches = false, render }) => {
  const labelId = useId();
  const pick = (index) => onChange(options[(index + options.length) % options.length].id);
  const onKeyDown = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    pick(index + step);
    const buttons = event.currentTarget.parentElement.querySelectorAll("button");
    buttons[(index + step + options.length) % options.length]?.focus();
  };
  const List = swatches ? SwatchList : TileList;

  return (
    <Section>
      <Label id={labelId}>{label}</Label>
      <List role="radiogroup" aria-labelledby={labelId}>
        {options.map((option, index) => {
          const checked = option.id === value;
          const shared = {
            type: "button",
            role: "radio",
            "aria-checked": checked,
            tabIndex: checked ? 0 : -1,
            onClick: () => onChange(option.id),
            onKeyDown: (event) => onKeyDown(event, index),
          };
          return swatches ? (
            <Swatch
              key={option.id}
              {...shared}
              $colour={option.id}
              aria-label={option.label}
              title={option.label}
            />
          ) : (
            <Tile key={option.id} {...shared}>
              {render(option)}
              <span>{option.label}</span>
            </Tile>
          );
        })}
      </List>
    </Section>
  );
};

const Wardrobe = ({ look, onSave, onClose }) => {
  const [draft, setDraft] = useState(look);
  const [tab, setTab] = useState("body");
  const change = (key) => (value) => setDraft((current) => ({ ...current, [key]: value }));
  const outfit = OUTFITS.find((option) => option.id === draft.outfit);

  const pickBody = (bodyType) => {
    if (bodyType === draft.body) return;
    setDraft((current) => ({ ...current, ...BODY_PRESETS[bodyType] }));
  };

  return (
    <Modal
      title="Wardrobe"
      tagline="Dress up your character. It's saved on this device, and everyone in town sees your look."
      actionLabel="Save look"
      onClose={() => onSave(draft)}
      onCancel={onClose}
      wide
      taglineOnPhones={false}
      footer={
        <FooterButton type="button" onClick={onClose}>
          Cancel
          <ChromeFrame spikes={false} />
        </FooterButton>
      }
    >
      <Layout>
        <PreviewColumn>
          <Suspense fallback={<PreviewLoading>Getting ready…</PreviewLoading>}>
            <WardrobePreview look={draft} />
          </Suspense>
          <PreviewButtons>
            <SmallButton type="button" onClick={() => setDraft(randomLook())}>
              <Dice />
              Random
              <ChromeFrame spikes={false} />
            </SmallButton>
            <SmallButton type="button" onClick={() => setDraft({ ...DEFAULT_LOOK })}>
              Default
              <ChromeFrame spikes={false} />
            </SmallButton>
          </PreviewButtons>
        </PreviewColumn>

        <Options>
          <Tabs role="tablist" aria-label="Wardrobe sections">
            {TABS.map(({ id, label }) => (
              <Tab
                key={id}
                type="button"
                role="tab"
                id={`wardrobe-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="wardrobe-panel"
                onClick={() => setTab(id)}
              >
                {label}
              </Tab>
            ))}
          </Tabs>

          <Panel role="tabpanel" id="wardrobe-panel" aria-labelledby={`wardrobe-tab-${tab}`}>
            {tab === "body" && (
              <>
                <Choices
                  label="Character"
                  options={BODIES}
                  value={draft.body}
                  onChange={pickBody}
                  render={(option) => (
                    <HairIcon
                      style={option.id === "girl" ? "long" : "spiky"}
                      colour={draft.hairColour}
                      skin={draft.skin}
                    />
                  )}
                />
                <Choices label="Skin" options={SKIN_TONES} value={draft.skin} onChange={change("skin")} swatches />
                <Choices label="Eyes" options={EYE_COLOURS} value={draft.eyes} onChange={change("eyes")} swatches />
              </>
            )}

            {tab === "hair" && (
              <>
                <Choices
                  label="Style"
                  options={HAIR_STYLES}
                  value={draft.hair}
                  onChange={change("hair")}
                  render={(option) => (
                    <HairIcon style={option.id} colour={draft.hairColour} skin={draft.skin} />
                  )}
                />
                <Choices
                  label="Colour"
                  options={HAIR_COLOURS}
                  value={draft.hairColour}
                  onChange={change("hairColour")}
                  swatches
                />
              </>
            )}

            {tab === "outfit" && (
              <>
                <Choices
                  label="Outfit"
                  options={OUTFITS}
                  value={draft.outfit}
                  onChange={change("outfit")}
                  render={(option) => (
                    <OutfitIcon outfit={option.id} main={draft.main} second={draft.second} />
                  )}
                />
                {outfit?.colours ? (
                  <>
                    <Choices label="Main colour" options={OUTFIT_COLOURS} value={draft.main} onChange={change("main")} swatches />
                    <Choices label="Second colour" options={OUTFIT_COLOURS} value={draft.second} onChange={change("second")} swatches />
                  </>
                ) : (
                  <Note>The adventurer outfit keeps its own colours. Pick any other outfit to colour it in.</Note>
                )}
              </>
            )}

            {tab === "extras" && (
              <>
                <Choices
                  label="Wear"
                  options={EXTRAS}
                  value={draft.extra}
                  onChange={change("extra")}
                  render={(option) => (
                    <ExtraIcon
                      extra={option.id}
                      colour={draft.extraColour}
                      skin={draft.skin}
                      hair={draft.hairColour}
                    />
                  )}
                />
                {draft.extra !== "none" && draft.extra !== "catEars" && (
                  <Choices
                    label="Colour"
                    options={OUTFIT_COLOURS}
                    value={draft.extraColour}
                    onChange={change("extraColour")}
                    swatches
                  />
                )}
              </>
            )}
          </Panel>
        </Options>
      </Layout>
    </Modal>
  );
};

const Dice = () => (
  <svg viewBox="0 0 10 10" width="15" height="15" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="currentColor" d="M1 0h8v1h1v8H9v1H1V9H0V1h1z" />
    <path fill="#fff" d="M2 2h2v2H2zM6 6h2v2H6zM4 4h2v2H4z" />
  </svg>
);

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 22px;

  @media (min-width: ${WIDE_FROM}px) {
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 30px;
    min-height: 470px;
  }
`;

const PreviewColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;

  & > :first-child {
    flex: 1;
    min-height: 260px;
  }

  /* Stacked above the options, it stays pinned at the top while they scroll under it, so the
     character is always in view while picking */
  @media (max-width: ${WIDE_FROM - 1}px) {
    position: sticky;
    /* Out to the edges of the popup's scrolling area, past its padding */
    top: -26px;
    z-index: 2;
    margin: -26px -32px 0;
    padding: 26px 32px 12px;
    background: ${paper};
    box-shadow: 0 10px 12px -12px rgba(20, 35, 90, 0.35);

    & > :first-child {
      flex: none;
      height: 260px;
    }
  }

  @media (max-width: 520px) {
    gap: 10px;
    top: -22px;
    margin: -22px -22px 0;
    padding: 22px 22px 10px;

    & > :first-child {
      height: 190px;
      min-height: 0;
    }
  }
`;

const PreviewLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: linear-gradient(#a9dcf3 0%, #e4f5fc 64%, #c9e7b9 64%, #a8d695 100%);
  color: ${inkSoft};
  font: 500 16px / 1 ${pixel};
`;

const PreviewButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 14px;
`;

const SmallButton = styled.button`
  ${chromeButton}
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  color: ${ink};
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
`;

const FooterButton = styled(SmallButton)`
  padding: 11px 22px;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 520px) {
    gap: 6px;
  }

  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 8px 18px;
  border: 2px solid rgba(20, 35, 90, 0.16);
  border-radius: 999px;
  background: #fff;
  color: ${ink};
  font: 600 18px / 1.1 ${pixel};
  /* Pixelify joins "fi" into one letter that reads as an A */
  font-variant-ligatures: none;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;

  &:hover {
    border-color: rgba(20, 35, 90, 0.4);
  }

  &[aria-selected="true"] {
    background: ${ink};
    border-color: ${ink};
    color: #fff;
  }

  /* All four fit on one line on a phone */
  @media (max-width: 520px) {
    padding: 7px 12px;
    font-size: 16px;
  }
`;

const Panel = styled.div`
  display: grid;
  gap: 22px;
`;

const Section = styled.div`
  display: grid;
  gap: 10px;
`;

const Label = styled.h4`
  margin: 0;
  font: 600 19px / 1.2 ${pixel};
  font-variant-ligatures: none;
`;

const TileList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 10px;
`;

const Tile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px 9px;
  border: 2px solid rgba(20, 35, 90, 0.1);
  border-radius: 14px;
  background: linear-gradient(#fff, #eef2f8);
  color: ${ink};
  font: 700 14px / 1.2 ${body};
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(20, 35, 90, 0.3);
  }

  &[aria-checked="true"] {
    border-color: ${focusBlue};
    background: linear-gradient(#f4fbff, #dcefff);
    box-shadow: 0 0 0 3px rgba(31, 127, 214, 0.22);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const SwatchList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Swatch = styled.button`
  position: relative;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 50%;
  background: ${({ $colour }) => $colour};
  box-shadow: 0 1px 4px rgba(20, 35, 90, 0.4);
  cursor: pointer;
  transition: transform 120ms ease;

  &:hover {
    transform: scale(1.1);
  }

  &[aria-checked="true"] {
    outline: 3px solid ${ink};
    outline-offset: 2px;
  }

  &[aria-checked="true"]::after {
    content: "";
    position: absolute;
    inset: 9px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(20, 35, 90, 0.35);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const Note = styled.p`
  margin: 0;
  color: ${inkSoft};
  font-size: 15px;
`;

export default Wardrobe;
