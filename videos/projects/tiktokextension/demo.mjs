// The extension's real, unmodified scripts on a local test page with a generated clip, so no TikTok
// pages or real people's videos are recorded. record.mjs has no persistent context, so instead of
// --load-extension the content scripts are injected at the same point Chrome would run them, with
// chrome.storage backed by localStorage. script.js only runs when the URL contains tiktok.com's
// address, which the query string below satisfies without touching the script.
import fs from "node:fs";

const EXT = "/private/tmp/claude-501/-Users-roger-coding-gamePortfolio/8a7662de-a0ed-45a9-ab96-8d652e71f2b0/scratchpad/apps/tiktok/ext";
const BADGE = "/private/tmp/claude-501/-Users-roger-coding-gamePortfolio/8a7662de-a0ed-45a9-ab96-8d652e71f2b0/scratchpad/apps/tiktok/badge.png";
const PAGE = "/test.html?demo=https://www.tiktok.com/";

const chromeShim = () => {
  const read = () => {
    const v = localStorage.getItem("ext.enabled");
    return v === null ? {} : { enabled: v === "true" };
  };
  const listeners = [];
  window.addEventListener("storage", (e) => {
    if (e.key !== "ext.enabled") return;
    listeners.forEach((fn) => fn({ enabled: { newValue: e.newValue === "true" } }));
  });
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    sync: {
      get: async (defaults) => ({ ...defaults, ...read() }),
      set: async (items) => localStorage.setItem("ext.enabled", String(items.enabled)),
      onChanged: { addListener: (fn) => listeners.push(fn) },
    },
  };
  window.chrome.runtime = { onMessage: { addListener: () => {} } };
};

// Holds the left button down over the video for the length of `during`.
async function hold(d, during) {
  await d.hover("video");
  d.events.push({ type: "click", t: d.now(), x: d.mouse.x, y: d.mouse.y });
  await d.page.mouse.down();
  await during();
  await d.page.mouse.up();
}

export default {
  title: "TikTok Speed Extension",
  tagline: "A Chrome extension that plays TikTok videos at 2x while you hold the mouse down, like the mobile app.",
  url: "http://127.0.0.1:4137",
  viewport: { width: 1440, height: 810 },
  async setup({ context }) {
    const scripts = ["libs/mutation_summary.js", "js/observer.js", "js/script.js"]
      .map((f) => fs.readFileSync(`${EXT}/${f}`, "utf8"))
      .join("\n;\n");
    await context.addInitScript(chromeShim);
    await context.addInitScript(
      `if (window === top && location.pathname === "/test.html") {
         document.addEventListener("DOMContentLoaded", () => (0, eval)(${JSON.stringify(scripts)}));
       }`,
    );
    // The extension loads its 2x badge from imgur, so serve a saved copy of the same image.
    await context.route("https://i.imgur.com/**", (route) => route.fulfill({ path: BADGE, contentType: "image/png" }));
  },
  async run(d) {
    await d.goto(PAGE);
    await d.waitFor("video");
    await d.popup("This is a local test page with a generated clip, running the extension's own scripts rather than TikTok.");

    await d.click("video", { after: 500 });
    await d.popup("A quick click leaves the speed alone, because on TikTok a click pauses the video.", { on: "#rate" });

    await hold(d, async () => {
      await d.wait(500);
      await d.popup("Hold the mouse on the video for 0.3 seconds and it plays at 2x, like the TikTok mobile app.", { on: "#rate" });
      await d.wait(1000);
    });
    await d.wait(400);
    await d.popup("Let go and it drops straight back to normal speed.", { on: "#rate", hold: 2000 });

    const toggle = d.page.frameLocator("#ext-popup").locator(".slider");
    await d.click(toggle, { popup: "The extension's popup can switch it off, and the choice is saved in Chrome's synced storage.", after: 800 });
    await d.goto(PAGE);
    await d.waitFor("video");
    await hold(d, async () => {
      await d.wait(500);
      await d.popup("Once the page reloads with it switched off, holding the mouse leaves the speed alone.", { on: "#rate" });
    });
    await d.wait(400);

    await d.click(toggle, { after: 500 });
    await hold(d, async () => {
      await d.wait(500);
      await d.popup("Switching it back on works without a reload, because the script listens for changes to that setting.", { on: "#rate" });
      await d.wait(400);
    });
    await d.wait(500);
  },
};
