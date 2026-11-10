// Turns a recorded take into a finished click-through film: HyperFrames project -> check ->
// render -> compressed mp4 + poster in web/public/videos.
// Usage: node lib/compose.mjs <slug> [--draft] [--no-render]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1920, H = 1080, FPS = 30;
const TITLE = 2.2, END = 2.0, FADE = 0.3;
const C = { sky: "#86CDEB", ink: "#14235A", paper: "#F7FBFD", crimson: "#A8123F", sakura: "#FFD9E2", cobalt: "#1B3A9C", terra: "#C8643A", grass: "#2E8B3D" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f2 = (n) => Number(n).toFixed(3);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Same rooftops as the portfolio's document pages, so the film and its page look related.
const BUILDINGS = [
  [0, 13, 34, "#A8123F", "#6E0A29"],
  [34, 19, 26, "#C8643A", "#A8123F"],
  [60, 9, 30, "#2E8B3D", "#1F5F2A"],
  [90, 15, 42, "#1B3A9C", "#14235A"],
  [132, 21, 24, "#C8643A", "#1B3A9C"],
  [156, 11, 36, "#A8123F", "#14235A"],
  [192, 17, 30, "#2E8B3D", "#A8123F"],
  [222, 8, 28, "#1B3A9C", "#6E0A29"],
  [250, 18, 40, "#C8643A", "#14235A"],
  [290, 12, 30, "#A8123F", "#1F5F2A"],
  [320, 20, 28, "#1B3A9C", "#A8123F"],
  [348, 10, 36, "#C8643A", "#6E0A29"],
];
const roofs = () => `<svg class="roofs" style="bottom:0" width="${W}" height="200" viewBox="0 0 384 40" shape-rendering="crispEdges" preserveAspectRatio="xMidYMax slice">
  ${BUILDINGS.map(([x, top, w, wall, roof]) => {
    const panes = [];
    for (let wy = top + 7; wy < 36; wy += 7) for (let wx = x + 4; wx < x + w - 5; wx += 8) panes.push(`<rect x="${wx}" y="${wy}" width="3" height="3" fill="#FFE9B8"/>`);
    return `<rect x="${x}" y="${top}" width="${w}" height="${40 - top}" fill="${wall}"/><rect x="${x - 1}" y="${top}" width="${w + 2}" height="2" fill="${roof}"/><rect x="${x + 1}" y="${top - 2}" width="${w - 2}" height="2" fill="${roof}"/><rect x="${x + 3}" y="${top - 4}" width="${w - 6}" height="2" fill="${roof}"/>${panes.join("")}`;
  }).join("")}
</svg>`;

function layout(tl) {
  const aspect = tl.viewport.width / tl.viewport.height;
  // A phone recording stands on the sky with popups beside it. Anything else fills the film,
  // because the portfolio page draws the frame around the video.
  if (tl.mobile) {
    const fh = H - 96, fw = Math.round(fh * aspect);
    return { fw, fh, fx: 300, fy: 48, sx: fw / tl.viewport.width, mobile: true };
  }
  const fw = W, fh = Math.round(W / aspect);
  return { fw, fh, fx: 0, fy: Math.round((H - fh) / 2), sx: fw / tl.viewport.width, mobile: false };
}

function placeBubble(ev, L, zoomState) {
  const bw = 640;
  const lines = Math.ceil(ev.text.length / 34);
  const bh = 52 + lines * 42;
  // A phone recording is narrow, so its popups sit in the free space beside it.
  if (L.mobile) {
    const y = ev.box ? L.fy + ev.box.y * L.sx : H / 2 - bh / 2;
    return { x: L.fx + L.fw + 44, y: clamp(y, 40, H - bh - 40), w: Math.min(bw, W - (L.fx + L.fw + 44) - 40), side: "none", px: 0 };
  }
  if (!ev.box) return { x: (W - bw) / 2, y: H - bh - 40, w: bw, side: "none", px: 0 };
  const { z, tx, ty } = zoomState;
  const cx = L.fx + (ev.box.x + ev.box.width / 2) * L.sx * z + tx;
  const top = L.fy + ev.box.y * L.sx * z + ty;
  const bot = L.fy + (ev.box.y + ev.box.height) * L.sx * z + ty;
  const gap = 26;
  const side = bot + gap + bh < H - 20 ? "below" : top - gap - bh > 20 ? "above" : "below";
  const y = side === "below" ? Math.min(bot + gap, H - bh - 20) : top - gap - bh;
  const x = clamp(cx - bw / 2, 24, W - bw - 24);
  return { x, y, w: bw, side, px: clamp(cx - x, 40, bw - 40) };
}

function zoomFor(ev, L) {
  const z = ev.zoom ?? 1;
  if (z <= 1 || !ev.box) return { z: 1, tx: 0, ty: 0 };
  const cx = (ev.box.x + ev.box.width / 2) * L.sx;
  const cy = (ev.box.y + ev.box.height / 2) * L.sx;
  // Keep the target centred without letting the footage leave its frame.
  const tx = clamp(L.fw / 2 - cx * z, L.fw - L.fw * z, 0);
  const ty = clamp(L.fh / 2 - cy * z, L.fh - L.fh * z, 0);
  return { z, tx, ty };
}

export function buildHtml(tl) {
  const L = layout(tl);
  const start = TITLE - FADE;
  const filmEnd = start + tl.duration;
  const total = filmEnd + END;
  const clips = [];
  const tweens = [];
  tl.events.forEach((ev, i) => {
    const t = start + ev.t;
    if (ev.type === "click") {
      const x = L.fx + ev.x * L.sx, y = L.fy + ev.y * L.sx;
      ev._z = null;
      clips.push({ kind: "click", i, t, x, y, ev });
    } else {
      const zs = zoomFor(ev, L);
      const b = placeBubble(ev, L, zs);
      clips.push({ kind: "popup", i, t, dur: ev.duration, b, ev, zs });
      if (zs.z > 1) {
        tweens.push(`tl.to("#zoom",{x:${zs.tx},y:${zs.ty},scale:${zs.z},duration:.55,ease:"power2.inOut"},${f2(t - 0.15)});`);
        tweens.push(`tl.to("#zoom",{x:0,y:0,scale:1,duration:.55,ease:"power2.inOut"},${f2(t + ev.duration + 0.05)});`);
      }
    }
  });
  // A click while zoomed appears where the zoomed footage shows it.
  const zoomAt = (t) => { const p = clips.find((c) => c.kind === "popup" && c.zs.z > 1 && t >= c.t && t <= c.t + c.dur + 0.3); return p ? p.zs : { z: 1, tx: 0, ty: 0 }; };
  const overlays = clips.map((c) => {
    if (c.kind === "click") {
      const zs = zoomAt(c.t);
      const x = L.fx + c.ev.x * L.sx * zs.z + zs.tx, y = L.fy + c.ev.y * L.sx * zs.z + zs.ty;
      tweens.push(`tl.fromTo("#ring${c.i}",{scale:.3,opacity:1},{scale:1.6,opacity:0,duration:.5,ease:"power2.out"},${f2(c.t)});`);
      return `<div id="click${c.i}" class="clip layer" data-start="${f2(c.t)}" data-duration=".6" data-track-index="3" data-layout-allow-overlap><div id="ring${c.i}" class="ring" style="left:${x - 42}px;top:${y - 42}px"></div></div>`;
    }
    const { b } = c;
    tweens.push(`tl.fromTo("#bub${c.i}",{y:${c.b.side === "above" ? 16 : -16},opacity:0},{y:0,opacity:1,duration:.26,ease:"power3.out"},${f2(c.t + 0.08)});`);
    tweens.push(`tl.to("#bub${c.i}",{opacity:0,duration:.16},${f2(c.t + c.dur - 0.14)});`);
    const tail = b.side === "none" ? "" : `<i class="tail ${b.side}" style="left:${b.px - 14}px"></i>`;
    return `<div id="pop${c.i}" class="clip layer" data-start="${f2(c.t)}" data-duration="${f2(c.dur)}" data-track-index="4" data-layout-allow-overlap><div id="bub${c.i}" class="bubble" style="left:${b.x}px;top:${b.y}px;width:${b.w}px">${tail}<div class="say"><p>${esc(c.ev.text)}</p></div></div></div>`;
  }).join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=${W}, height=${H}"/>
<script src="assets/gsap.min.js"></script>
<style>
@font-face{font-family:"Pixelify Sans";src:url(assets/fonts/pixelify.woff2) format("woff2");font-weight:400 700}
@font-face{font-family:"Zen Kaku Gothic New";src:url(assets/fonts/zen-500.woff2) format("woff2");font-weight:500}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${C.sky}}
#root{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${C.sky}}
.layer{position:absolute;inset:0}
.roofs{position:absolute;left:0}
.card{display:flex;flex-direction:column;justify-content:center;padding:0 150px 130px;color:${C.ink};background:${C.sky}}
.card h1{font:600 150px/1.02 "Pixelify Sans";letter-spacing:-.01em}
.card p{font:500 44px/1.3 "Zen Kaku Gothic New";max-width:1300px;margin-top:26px}
#screen{position:absolute;left:${L.fx - 8}px;top:${L.fy - 8}px;width:${L.fw + 16}px;height:${L.fh + 16}px;background:${C.ink};display:${L.mobile ? "block" : "none"}}
#frame{position:absolute;left:${L.fx}px;top:${L.fy}px;width:${L.fw}px;height:${L.fh}px;overflow:hidden;background:#fff}
#zoom{position:absolute;left:0;top:0;width:${L.fw}px;height:${L.fh}px;transform-origin:0 0}
#footage{width:${L.fw}px;height:${L.fh}px;display:block}
.ring{position:absolute;width:84px;height:84px;border:8px solid ${C.crimson};background:transparent}
.bubble{position:absolute}
.say{background:${C.ink};color:#fff;padding:24px 30px;clip-path:polygon(0 8px,8px 8px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 8px) calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 8px),0 calc(100% - 8px))}
.bubble p{font:500 34px/1.26 "Zen Kaku Gothic New"}
.tail{position:absolute;width:28px;height:14px;background:${C.ink};clip-path:polygon(7px 0,21px 0,21px 7px,28px 7px,28px 14px,0 14px,0 7px,7px 7px)}
.tail.below{top:-13px}.tail.above{bottom:-13px;transform:scaleY(-1)}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${f2(total)}" data-width="${W}" data-height="${H}">
  <div id="filmbg" class="layer">
    <div id="screen"></div>
    <div id="frame"><div id="zoom"><video id="footage" class="clip" src="assets/footage.mp4" muted data-start="${f2(start)}" data-duration="${f2(tl.duration)}" data-track-index="1"></video></div></div>
  </div>
${overlays}
  <div id="titleCard" class="clip layer" data-start="0" data-duration="${f2(TITLE)}" data-track-index="5" data-layout-allow-overflow>
    <div id="titleInner" class="layer card"><h1 id="tt">${esc(tl.title)}</h1><p id="ts">${esc(tl.tagline)}</p>${roofs()}</div>
  </div>
  <div id="endCard" class="clip layer" data-start="${f2(filmEnd)}" data-duration="${f2(END)}" data-track-index="5" data-layout-allow-overflow>
    <div id="endInner" class="layer card"><h1 id="et">${esc(tl.title)}</h1><p>Built by Roger Truong</p>${roofs()}</div>
  </div>
</div>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
tl.from("#tt",{y:24,opacity:0,duration:.4,ease:"power3.out"},.1);
tl.from("#ts",{y:18,opacity:0,duration:.4,ease:"power3.out"},.28);
tl.to("#titleInner",{opacity:0,duration:${FADE},ease:"none"},${f2(TITLE - FADE)});
tl.from("#endInner",{opacity:0,duration:${FADE},ease:"none"},${f2(filmEnd)});
${tweens.join("\n")}
window.__timelines["main"]=tl;
</script></body></html>`;
}

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, HYPERFRAMES_NO_TELEMETRY: "1", HYPERFRAMES_NO_UPDATE_CHECK: "1", HYPERFRAMES_SKIP_SKILLS: "1" } });

export function compose(slug, { draft = false, render = true } = {}) {
  const foot = path.join(root, "footage", slug);
  const tl = JSON.parse(fs.readFileSync(path.join(foot, "timeline.json"), "utf8"));
  const dir = path.join(root, "build", slug);
  fs.mkdirSync(path.join(dir, "assets", "fonts"), { recursive: true });
  fs.copyFileSync(path.join(foot, "footage.mp4"), path.join(dir, "assets", "footage.mp4"));
  fs.copyFileSync(path.join(root, "assets", "gsap.min.js"), path.join(dir, "assets", "gsap.min.js"));
  for (const f of ["pixelify.woff2", "zen-500.woff2"]) fs.copyFileSync(path.join(root, "assets", "fonts", f), path.join(dir, "assets", "fonts", f));
  fs.writeFileSync(path.join(dir, "index.html"), buildHtml(tl));
  fs.writeFileSync(path.join(dir, "hyperframes.json"), JSON.stringify({ paths: { assets: "assets" } }, null, 2));
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ id: slug, name: tl.title }, null, 2));
  if (!render) return dir;
  const bin = path.join(root, "node_modules", ".bin", "hyperframes");
  const raw = path.join(dir, "render.mp4");
  run(bin, ["render", "--quality", draft ? "draft" : "looks", "--fps", String(FPS), "--output", raw], dir);
  const outDir = path.resolve(root, "..", "web", "public", "videos");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${slug}.mp4`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], dir);
  // Poster: the first popup's moment, because the title card alone doesn't show the product.
  const first = tl.events.find((e) => e.type === "popup");
  const at = TITLE - FADE + (first ? first.t + 0.7 : 1);
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(at), "-i", raw, "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "4", path.join(outDir, `${slug}.jpg`)], dir);
  const mb = (fs.statSync(out).size / 1e6).toFixed(1);
  console.log(`${out}: ${mb} MB`);
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const { withTurn } = await import("./turn.mjs");
  const slug = process.argv[2];
  await withTurn(async () => compose(slug, { draft: process.argv.includes("--draft"), render: !process.argv.includes("--no-render") }));
}
