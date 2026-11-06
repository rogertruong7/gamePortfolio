import { readStore, writeStore } from "../../Helpers/storage.js";

// Everything a player can change about their character. A look is a small object of ids and hex
// colours. It's saved on this device and sent to everyone else in the town, so anything read back
// from storage or the network goes through sanitizeLook first.

export const BODIES = [
  { id: "boy", label: "Boy" },
  { id: "girl", label: "Girl" },
];

// "spiky" is the model's own hair. Every other style starts from the same hair pulled in close to
// the head, with any extra pieces added on top.
export const HAIR_STYLES = [
  { id: "spiky", label: "Spiky" },
  { id: "short", label: "Short" },
  { id: "bob", label: "Bob" },
  { id: "long", label: "Long" },
  { id: "ponytail", label: "Ponytail" },
  { id: "twintails", label: "Twin tails" },
  { id: "bun", label: "Bun" },
];

export const HAIR_COLOURS = [
  { id: "#1c1b22", label: "Black" },
  { id: "#4a2c1d", label: "Dark brown" },
  { id: "#8a5a35", label: "Brown" },
  { id: "#e3c16f", label: "Blonde" },
  { id: "#c4622d", label: "Ginger" },
  { id: "#f29bb8", label: "Pink" },
  { id: "#a98ad6", label: "Lavender" },
  { id: "#4f7fd1", label: "Blue" },
  { id: "#6cc4a4", label: "Mint" },
  { id: "#dcdde4", label: "Silver" },
];

// The first is the colour painted into the model's texture
export const SKIN_TONES = [
  { id: "#f2c3a1", label: "Peach" },
  { id: "#f9dcc8", label: "Light" },
  { id: "#e2b07f", label: "Golden" },
  { id: "#c98b5e", label: "Tan" },
  { id: "#a2663f", label: "Brown" },
  { id: "#6e4127", label: "Deep" },
];

export const EYE_COLOURS = [
  { id: "#2f86d6", label: "Blue" },
  { id: "#6b3e1e", label: "Brown" },
  { id: "#3a9a5b", label: "Green" },
  { id: "#b08a2e", label: "Hazel" },
  { id: "#7d8794", label: "Grey" },
  { id: "#8a5cc7", label: "Purple" },
  { id: "#c23a3a", label: "Red" },
];

// Each outfit takes a main and a second colour. "original" is the outfit painted into the model.
export const OUTFITS = [
  { id: "original", label: "Adventurer", colours: false },
  { id: "tee", label: "Tee & shorts", colours: true },
  { id: "hoodie", label: "Hoodie", colours: true },
  { id: "dress", label: "Dress", colours: true },
  { id: "overalls", label: "Overalls", colours: true },
  { id: "suit", label: "Suit", colours: true },
  { id: "sailor", label: "Sailor", colours: true },
  { id: "yukata", label: "Yukata", colours: true },
];

export const OUTFIT_COLOURS = [
  { id: "#2c3e74", label: "Navy" },
  { id: "#7cc4e8", label: "Sky" },
  { id: "#c8323c", label: "Red" },
  { id: "#f3a1bf", label: "Pink" },
  { id: "#f2c84b", label: "Yellow" },
  { id: "#4f9a5a", label: "Green" },
  { id: "#9fdcc4", label: "Mint" },
  { id: "#7d5bb5", label: "Purple" },
  { id: "#f4f4f0", label: "White" },
  { id: "#8a8f99", label: "Grey" },
  { id: "#2a2a30", label: "Black" },
  { id: "#7a5233", label: "Brown" },
];

export const EXTRAS = [
  { id: "none", label: "None" },
  { id: "bow", label: "Bow" },
  { id: "catEars", label: "Cat ears" },
  { id: "cap", label: "Cap" },
  { id: "beanie", label: "Beanie" },
  { id: "flower", label: "Flower" },
  { id: "glasses", label: "Glasses" },
];

// The character everyone starts as, exactly as the model was made
export const DEFAULT_LOOK = Object.freeze({
  body: "boy",
  hair: "spiky",
  hairColour: HAIR_COLOURS[0].id,
  skin: SKIN_TONES[0].id,
  eyes: EYE_COLOURS[0].id,
  outfit: "original",
  main: OUTFIT_COLOURS[0].id,
  second: OUTFIT_COLOURS[8].id,
  extra: "none",
  extraColour: OUTFIT_COLOURS[2].id,
});

// Picking a body type also swaps in a starting point that suits it, which can then be changed
export const BODY_PRESETS = {
  boy: { body: "boy", hair: "spiky", outfit: "original", extra: "none" },
  girl: {
    body: "girl",
    hair: "long",
    hairColour: HAIR_COLOURS[2].id,
    outfit: "dress",
    main: OUTFIT_COLOURS[3].id,
    second: OUTFIT_COLOURS[8].id,
    extra: "bow",
    extraColour: OUTFIT_COLOURS[2].id,
  },
};

const CHOICES = {
  body: BODIES,
  hair: HAIR_STYLES,
  hairColour: HAIR_COLOURS,
  skin: SKIN_TONES,
  eyes: EYE_COLOURS,
  outfit: OUTFITS,
  main: OUTFIT_COLOURS,
  second: OUTFIT_COLOURS,
  extra: EXTRAS,
  extraColour: OUTFIT_COLOURS,
};

// Keeps only values from the lists above, so nothing unexpected reaches the shaders or the page
export function sanitizeLook(raw) {
  const look = { ...DEFAULT_LOOK };
  if (!raw || typeof raw !== "object") return look;
  Object.entries(CHOICES).forEach(([key, options]) => {
    const value = raw[key];
    if (typeof value === "string" && options.some((option) => option.id === value)) {
      look[key] = value;
    }
  });
  return look;
}

export function sameLook(a, b) {
  return Object.keys(CHOICES).every((key) => a[key] === b[key]);
}

const STORE_KEY = "characterLook";

export function loadLook() {
  const saved = readStore(STORE_KEY);
  if (!saved) return { ...DEFAULT_LOOK };
  try {
    return sanitizeLook(JSON.parse(saved));
  } catch {
    return { ...DEFAULT_LOOK };
  }
}

export function saveLook(look) {
  writeStore(STORE_KEY, JSON.stringify(sanitizeLook(look)));
}

const pick = (options) => options[Math.floor(Math.random() * options.length)].id;

export function randomLook() {
  const body = pick(BODIES);
  return {
    body,
    hair: pick(HAIR_STYLES),
    hairColour: pick(HAIR_COLOURS),
    skin: pick(SKIN_TONES),
    eyes: pick(EYE_COLOURS),
    outfit: pick(OUTFITS.slice(1)),
    main: pick(OUTFIT_COLOURS),
    second: pick(OUTFIT_COLOURS),
    extra: pick(EXTRAS),
    extraColour: pick(OUTFIT_COLOURS),
  };
}
