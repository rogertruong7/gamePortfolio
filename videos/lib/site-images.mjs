// Generates the site's favicon set and link-preview image into web/public.
// Needs the dev server on localhost:5299, because the thumbnail uses a real render of the town.
// Usage: node lib/site-images.mjs [--reuse-town]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.resolve(root, "..", "web", "public");
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
    name: "roger's portfolio",
    short_name: "roger",
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
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await context.route("**/api/**", (route) => route.fulfill({ status: 204, body: "" }));
  await context.addInitScript(() => localStorage.setItem("visited", "true"));
  // For this shot only, without touching the game: start the camera further back than usual.
  await context.route(/\/src\/Game\/MainCamera\.jsx/, async (route) => {
    const response = await route.fetch();
    const code = (await response.text()).replace("new THREE.Vector3(140, 90, 140)", "new THREE.Vector3(205, 118, 205)");
    if (!code.includes("205, 118, 205")) throw new Error("camera offset not found in MainCamera.jsx");
    await route.fulfill({ response, body: code });
  });
  const page = await context.newPage();
  await page.goto(SITE, { waitUntil: "load" });
  await page.waitForFunction(() => !document.getElementById("loading_screen") && document.querySelector("canvas"), null, { timeout: 90000 });
  await page.addStyleTag({ content: "#root button, #root a { display: none !important }" });
  await page.waitForTimeout(6000); // lets the camera settle and petals spread
  await page.screenshot({ path: townFile });
  await context.close();
}

async function renderThumbnail() {
  const town = fs.readFileSync(townFile).toString("base64");
  const font = fs.readFileSync(path.join(root, "assets", "fonts", "pixelify.woff2")).toString("base64");
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  // Bake the real frame with the game's own code, on the dev server's origin so it can be imported.
  await page.route(`${SITE}/__og`, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
  await page.goto(`${SITE}/__og`);
  const frame = await page.evaluate(async () => {
    const { bakeChromeFrame } = await import("/src/UserInterface/chromeFrameBake.js");
    return bakeChromeFrame(582, 297, true);
  });
  // Baked at half size and shown at double, so the rim and spikes read at thumbnail size.
  const placed = `left:${18 - frame.padding * 2}px;top:${18 - frame.padding * 2}px;width:${frame.width * 2}px;height:${frame.height * 2}px`;
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Pixel; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 400 700; }
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; overflow: hidden; position: relative; background: #3f8fd6; font-family: Pixel; }
    #town { position: absolute; inset: 0; width: 1200px; height: 630px; display: block; }
    #frame { position: absolute; display: block; filter: drop-shadow(0 3px 5px rgba(7, 8, 12, 0.45)); }
    #shade { position: absolute; left: 0; top: 0; width: 1200px; height: 132px; background: linear-gradient(180deg, rgba(20, 35, 90, 0.62) 0%, rgba(20, 35, 90, 0.45) 62%, rgba(20, 35, 90, 0) 100%); }
    h1 { position: absolute; left: 0; right: 0; top: 30px; text-align: center; color: #fff; font-weight: 700; font-size: 84px; line-height: 1; letter-spacing: 0.015em;
      -webkit-text-stroke: 6px #14235A; paint-order: stroke fill;
      text-shadow: 0 5px 0 #14235A, 0 12px 14px rgba(7, 14, 40, 0.5); }
  </style></head><body>
    <img id="town" src="data:image/png;base64,${town}">
    <div id="shade"></div>
    <h1>roger's portfolio</h1>
    <img id="frame" src="${frame.url}" style="${placed}">
  </body></html>`);
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode())]));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(pub, "og.png") });
  await page.close();
}

await renderIcons();
if (!process.argv.includes("--reuse-town") || !fs.existsSync(townFile)) await captureTown();
await renderThumbnail();
await browser.close();
console.log("wrote favicon set and og.png");
