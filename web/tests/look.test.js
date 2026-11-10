import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BODY_PRESETS,
  DEFAULT_LOOK,
  HAIR_STYLES,
  OUTFITS,
  randomLook,
  sameLook,
  sanitizeLook,
} from "../src/Game/look/lookOptions.js";
import { OUTFIT_NUMBERS } from "../src/Game/look/lookMaterial.js";

test("anything that isn't a look comes back as the default character", () => {
  for (const raw of [null, undefined, "spiky", 7, []]) {
    assert.deepEqual(sanitizeLook(raw), DEFAULT_LOOK);
  }
});

test("a valid look comes through unchanged", () => {
  const look = { ...DEFAULT_LOOK, hair: "twintails", outfit: "sailor", main: "#c8323c" };
  assert.deepEqual(sanitizeLook(look), look);
});

test("values that aren't on the lists are swapped for the default", () => {
  const look = sanitizeLook({
    hair: "mohawk",
    hairColour: "red; background:url(x)",
    outfit: { id: "dress" },
    extra: "bow",
  });
  assert.equal(look.hair, DEFAULT_LOOK.hair);
  assert.equal(look.hairColour, DEFAULT_LOOK.hairColour);
  assert.equal(look.outfit, DEFAULT_LOOK.outfit);
  assert.equal(look.extra, "bow");
});

test("extra keys are dropped", () => {
  const look = sanitizeLook({ ...DEFAULT_LOOK, script: "alert(1)" });
  assert.deepEqual(Object.keys(look).sort(), Object.keys(DEFAULT_LOOK).sort());
});

test("every preset and random look is a valid look", () => {
  Object.values(BODY_PRESETS).forEach((preset) => {
    const look = { ...DEFAULT_LOOK, ...preset };
    assert.ok(sameLook(sanitizeLook(look), look));
  });
  for (let i = 0; i < 50; i += 1) {
    const look = randomLook();
    assert.ok(sameLook(sanitizeLook(look), look));
  }
});

test("the shader knows every outfit", () => {
  OUTFITS.forEach(({ id }) => assert.equal(typeof OUTFIT_NUMBERS[id], "number", id));
  assert.ok(HAIR_STYLES.some(({ id }) => id === DEFAULT_LOOK.hair));
});
