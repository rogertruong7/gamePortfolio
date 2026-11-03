// Generates the site's favicon set and link-preview image into frontend/public.
// Needs the dev server on localhost:5299, because the thumbnail uses a real render of the town.
// Usage: node lib/site-images.mjs [--reuse-town]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "../../frontend/src/UserInterface/skylineData.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.resolve(root, "..", "frontend", "public");
const townFile = path.join(os.tmpdir(), "portfolio-town.png");
const SITE = "http://localhost:5299";

// videos/assets/player-face.png is the player model (cloudme.glb) rendered front-on with three.js,
// cut off at the chin and trimmed, on a transparent background.
const faceFile = path.join(root, "assets", "player-face.png");

const browser = await chromium.launch({ args: ["--mute-audio", "--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"] });

async function renderIcon(size, file, { background = "transparent", inset = 0 } = {}) {
  const face = `data:image/png;base64,${fs.readFileSync(faceFile).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = size - inset * 2;
  await page.setContent(`<!doctype html><body style="margin:0;background:${background}"><img src="${face}" width="${inner}" height="${inner}" style="display:block;margin:${inset}px"></body>`);
  await page.evaluate(() => document.images[0].decode());
  await page.screenshot({ path: file, omitBackground: background === "transparent" });
  await page.close();
}

async function renderIcons() {
  const icon32 = path.join(os.tmpdir(), "portfolio-icon-32.png");
  await renderIcon(32, icon32);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", icon32, path.join(pub, "favicon.ico")]);
  await renderIcon(32, path.join(pub, "favicon-32.png"));
  await renderIcon(192, path.join(pub, "icon-192.png"));
  await renderIcon(512, path.join(pub, "icon-512.png"));
  // iOS fills transparency with black, so its home-screen icon sits on the site's sky colour.
  await renderIcon(180, path.join(pub, "apple-touch-icon.png"), { background: "#86CDEB", inset: 16 });
  fs.writeFileSync(path.join(pub, "site.webmanifest"), `${JSON.stringify({
    name: "Roger Truong",
    short_name: "Roger",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#86CDEB",
    background_color: "#86CDEB",
    display: "browser",
  }, null, 2)}\n`);
}

async function captureTown() {
  const context = await browser.newContext({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 2 });
  await context.route("**/api/**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.addInitScript(() => localStorage.setItem("visited", "true"));
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "load" });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 60000 });
  await page.waitForFunction(() => !document.getElementById("loading_screen"), null, { timeout: 90000 });
  await page.addStyleTag({ content: "#root button, #root a { display: none !important }" });
  await page.waitForTimeout(7000); // lets the camera settle and petals spread
  await page.screenshot({ path: townFile });
  await context.close();
}

const skylineSvg = () => {
  const parts = BUILDINGS.map(([x, top, w, wall, roof]) => {
    const panes = [];
    for (let y = top + 7; y < 36; y += 7) for (let wx = x + 4; wx < x + w - 5; wx += 8) panes.push(`<rect x="${wx}" y="${y}" width="3" height="3" fill="#FFE9B8"/>`);
    return `<rect x="${x}" y="${top}" width="${w}" height="${40 - top}" fill="${wall}"/><rect x="${x - 1}" y="${top}" width="${w + 2}" height="2" fill="${roof}"/><rect x="${x + 1}" y="${top - 2}" width="${w - 2}" height="2" fill="${roof}"/><rect x="${x + 3}" y="${top - 4}" width="${w - 6}" height="2" fill="${roof}"/>${panes.join("")}`;
  });
  return `<svg id="skyline" viewBox="0 0 384 40" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges">${parts.join("")}</svg>`;
};

async function renderThumbnail() {
  const town = fs.readFileSync(townFile).toString("base64");
  const font = fs.readFileSync(path.join(root, "assets", "fonts", "pixelify.woff2")).toString("base64");
  const zen = fs.readFileSync(path.join(root, "assets", "fonts", "zen-500.woff2")).toString("base64");
  const n = 10;
  const stepped = `polygon(0 ${n}px,${n}px ${n}px,${n}px 0,calc(100% - ${n}px) 0,calc(100% - ${n}px) ${n}px,100% ${n}px,100% calc(100% - ${n}px),calc(100% - ${n}px) calc(100% - ${n}px),calc(100% - ${n}px) 100%,${n}px 100%,${n}px calc(100% - ${n}px),0 calc(100% - ${n}px))`;
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Pixel; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 400 700; }
    @font-face { font-family: Zen; src: url(data:font/woff2;base64,${zen}) format("woff2"); font-weight: 500; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #86CDEB; color: #14235A; }
    #skyline { position: absolute; left: 0; bottom: 0; width: 1200px; height: 150px; display: block; }
    #screen { position: absolute; right: 44px; top: 44px; width: 680px; height: 480px; padding: 10px; background: #14235A; clip-path: ${stepped}; }
    #screen img { display: block; width: 100%; height: 100%; object-fit: cover; }
    #copy { position: absolute; left: 52px; top: 76px; width: 420px; }
    h1 { font: 600 112px/0.96 Pixel; letter-spacing: -0.01em; }
    p { font: 500 37px/1.2 Zen; margin-top: 24px; }
  </style></head><body>
    ${skylineSvg()}
    <div id="screen"><img src="data:image/png;base64,${town}"></div>
    <div id="copy"><h1>Roger<br>Truong</h1><p>A portfolio you can walk around</p></div>
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(pub, "og.png") });
  await page.close();
}

await renderIcons();
if (!process.argv.includes("--reuse-town") || !fs.existsSync(townFile)) await captureTown();
await renderThumbnail();
await browser.close();
console.log("wrote favicon set and og.png");
