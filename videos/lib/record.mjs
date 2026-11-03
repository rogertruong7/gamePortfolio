// Records a real, driven browser session as crisp frames (CDP screencast), and logs where
// every click and popup happened so compose.mjs can place them in the final film.
// Usage: node lib/record.mjs <slug>   (demo script: projects/<slug>/demo.mjs)
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const readTime = (text) => Math.max(1600, Math.min(3600, 700 + text.length * 34));

const CURSOR = () => {
  const install = () => {
    if (document.getElementById("__demo_cursor") || !document.documentElement) return;
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M1 1v12h2v-1h1v-1h1v2h1v2h2v-2h-1v-2h-1v-1h3v-1h-1v-1h-1v-1h-1V7H6V6H5V5H4V4H3V3H2V2H1z" fill="#fff" stroke="#14235A" stroke-width="1"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", width: "28px", height: "28px" });
    document.documentElement.appendChild(c);
    const p = window.__demo_cursor_pos || { x: 640, y: 400 };
    c.style.transform = `translate(${p.x}px,${p.y}px)`;
  };
  window.__demo_move = (x, y) => {
    window.__demo_cursor_pos = { x, y };
    install();
    document.getElementById("__demo_cursor").style.transform = `translate(${x}px,${y}px)`;
  };
  const hideDevUi = () => {
    if (document.getElementById("__demo_hide") || !document.head) return;
    const st = document.createElement("style");
    st.id = "__demo_hide";
    st.textContent = "nextjs-portal,#__next-build-watcher,[data-nextjs-toast]{display:none!important}";
    document.head.appendChild(st);
  };
  document.addEventListener("DOMContentLoaded", () => { install(); hideDevUi(); });
  install();
};

class Demo {
  constructor(page, cdp, opts) {
    Object.assign(this, { page, cdp, opts });
    this.events = [];
    this.mouse = { x: 640, y: 400 };
    this.t0 = null;
    this.cuts = []; // [start, end] wall-clock ranges left out of the film (page loads, spinners)
  }
  // Film clock: wall-clock time with the cut ranges removed.
  now() {
    return Date.now() / 1000 - this.t0 - this.cuts.reduce((sum, [a, b]) => sum + (b - a), 0);
  }
  // Anything awaited in here happens off camera; the film jumps straight to the result.
  async cut(fn) {
    if (this.t0 === null) return fn();
    const a = Date.now() / 1000;
    try {
      return await fn();
    } finally {
      this.cuts.push([a, Date.now() / 1000]);
    }
  }
  async wait(ms) {
    await sleep(ms);
  }
  async waitFor(target, timeout = 30000) {
    await this.cut(async () => {
      await this.loc(target).waitFor({ state: "visible", timeout });
      await sleep(250);
    });
  }
  async goto(url, { settle = 900 } = {}) {
    const full = url.startsWith("http") ? url : new URL(url, this.opts.url).toString();
    await this.cut(async () => {
      await this.page.goto(full, { waitUntil: "domcontentloaded" });
      await this.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await this.page.evaluate(`document.fonts && document.fonts.ready`).catch(() => {});
      await sleep(settle);
    });
  }
  loc(target) {
    return typeof target === "string" ? this.page.locator(target).first() : target;
  }
  async box(target) {
    const l = this.loc(target);
    await l.waitFor({ state: "visible", timeout: 15000 });
    await l.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(120);
    const b = await l.boundingBox();
    if (!b) throw new Error(`no box for ${target}`);
    return b;
  }
  // Glides the visible cursor (and the real mouse) to a point, so hover states are real.
  async moveTo(x, y, ms = 420) {
    const from = { ...this.mouse };
    const steps = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      const px = from.x + (x - from.x) * k;
      const py = from.y + (y - from.y) * k;
      await this.page.mouse.move(px, py);
      await this.page.evaluate(([a, b]) => window.__demo_move && window.__demo_move(a, b), [px, py]).catch(() => {});
      await sleep(16);
    }
    this.mouse = { x, y };
  }
  async hover(target) {
    const b = await this.box(target);
    await this.moveTo(b.x + b.width / 2, b.y + b.height / 2);
  }
  // A popup is laid over the film at this moment; the recording holds still so it can be read.
  // { on: element it points at, zoom: punch-in (1 = none), hold: ms override }
  async popup(text, { on, zoom = 1, hold } = {}) {
    const box = on ? await this.box(on) : null;
    const duration = (hold ?? readTime(text)) / 1000;
    this.events.push({ type: "popup", t: this.now(), duration, text, box, zoom });
    await sleep(duration * 1000 + 250);
  }
  // Moves to a target, optionally shows a popup before the click, then really clicks it.
  async click(target, { popup, zoom = 1, hold, after = 700 } = {}) {
    const b = await this.box(target);
    await this.moveTo(b.x + b.width / 2, b.y + b.height / 2);
    if (popup) await this.popup(popup, { on: target, zoom, hold });
    const box = await this.box(target);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    this.events.push({ type: "click", t: this.now(), x, y });
    await this.page.mouse.down();
    await sleep(70);
    await this.page.mouse.up();
    await sleep(after);
  }
  // Clicks, then jumps straight to the moment `ready` is visible, skipping the load in between.
  async clickThrough(target, ready, opts = {}) {
    await this.click(target, { ...opts, after: 60 });
    await this.waitFor(ready);
  }
  // Types into a field one key at a time, like a person.
  async type(target, text, { delay = 45 } = {}) {
    await this.click(target, { after: 150 });
    await this.page.keyboard.type(text, { delay });
    await sleep(350);
  }
  async press(key, after = 500) {
    await this.page.keyboard.press(key);
    await sleep(after);
  }
  // Smooth wheel scroll, because a jump cut hides what the page contains.
  async scroll(dy, ms = 900) {
    const steps = Math.round(ms / 16);
    let done = 0;
    for (let i = 1; i <= steps; i++) {
      const next = dy * ease(i / steps);
      await this.page.mouse.wheel(0, next - done);
      done = next;
      await sleep(16);
    }
    await sleep(300);
  }
}

export async function record(slug) {
  const modUrl = pathToFileURL(path.join(root, "projects", slug, "demo.mjs")).href;
  const { default: spec } = await import(modUrl);
  const viewport = spec.viewport ?? { width: 1440, height: 810 };
  const outDir = path.join(root, "footage", slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, "frames"), { recursive: true });

  const browser = await chromium.launch({ args: spec.chromeArgs ?? [] });
  const scale = 1; // screencast frames are CSS pixels whatever the device scale, so compose.mjs scales up
  const context = await browser.newContext({ viewport, ...(spec.contextOptions ?? {}) });
  await context.addInitScript(CURSOR);
  if (spec.setup) await spec.setup({ context });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const demo = new Demo(page, cdp, { url: spec.url });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  if (spec.before) await spec.before(demo); // state to reach before the film starts rolling

  const frames = [];
  let writes = Promise.resolve();
  cdp.on("Page.screencastFrame", (f) => {
    const file = `f${String(frames.length).padStart(6, "0")}.jpg`;
    frames.push({ file, ts: f.metadata.timestamp });
    const buf = Buffer.from(f.data, "base64");
    writes = writes.then(() => fs.promises.writeFile(path.join(outDir, "frames", file), buf));
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 92,
    maxWidth: Math.round(viewport.width * scale),
    maxHeight: Math.round(viewport.height * scale),
    everyNthFrame: 1,
  });
  demo.t0 = Date.now() / 1000;
  await spec.run(demo);
  const end = Date.now() / 1000;
  await sleep(200);
  await cdp.send("Page.stopScreencast").catch(() => {});
  await writes;
  await browser.close();
  if (!frames.length) throw new Error("no frames captured");

  // Screencast frames only arrive on change, so each holds until the next one.
  const kept = (a, b) => demo.cuts.reduce((d, [x, y]) => d - Math.max(0, Math.min(b, y) - Math.max(a, x)), b - a);
  const list = frames
    .map((f, i) => {
      const next = i + 1 < frames.length ? frames[i + 1].ts : end;
      const dur = kept(f.ts, next);
      return dur > 0.0005 ? `file 'frames/${f.file}'\nduration ${dur.toFixed(4)}` : null;
    })
    .filter(Boolean)
    .join("\n");
  fs.writeFileSync(path.join(outDir, "frames.txt"), `${list}\nfile 'frames/${frames.at(-1).file}'\n`);
  const lead = Math.max(0, frames[0].ts - demo.t0);
  const size = { width: Math.round(viewport.width * scale), height: Math.round(viewport.height * scale) };
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt",
    "-vf", `tpad=start_duration=${lead.toFixed(3)}:start_mode=clone,fps=30,scale=${size.width}:${size.height}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-g", "15", "footage.mp4"], { cwd: outDir });
  fs.rmSync(path.join(outDir, "frames"), { recursive: true, force: true });
  fs.writeFileSync(path.join(outDir, "timeline.json"), JSON.stringify({
    slug, title: spec.title, tagline: spec.tagline, mobile: !!spec.mobile, addressBar: spec.addressBar ?? null,
    viewport, duration: end - demo.t0 - demo.cuts.reduce((sum, [a, b]) => sum + (b - a), 0), events: demo.events,
  }, null, 2));
  if (errors.length) console.warn(`page errors during take:\n${errors.slice(0, 5).join("\n")}`);
  console.log(`recorded ${slug}: ${(end - demo.t0 - demo.cuts.reduce((sum, [a, b]) => sum + (b - a), 0)).toFixed(1)}s, ${frames.length} frames, ${demo.events.length} events`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { withTurn } = await import("./turn.mjs");
  await withTurn(() => record(process.argv[2]));
}
