// Draws the chrome frame for a button: a rim, optionally with four small spikes at
// the top, bottom, left and right. The outline gets inflated into a rounded 3D surface and shaded with a
// painted chrome texture. Each button size is worked out once and saved as an image,
// so the frames add nothing to the cost of a game frame.

import { paintLiquidChrome } from "../Helpers/liquidChrome.js";

const PADDING_WITH_SPIKES = 14;
const PADDING_RIM_ONLY = 4;
const SCALE = 3; // pixels per CSS pixel, so the frames stay sharp on high-res screens
const CORNER_RADIUS = 20;
const INFLATE_DISTANCE = 3.1 * SCALE;
const NORMAL_STRENGTH = 1.35;

const frames = new Map();
let chrome = null;

function pointPath(cx, cy, rx, ry) {
  const k = 0.13; // how tight the waist is
  return (
    `M${cx - rx} ${cy}` +
    `Q${cx - rx * k} ${cy - ry * k} ${cx} ${cy - ry}` +
    `Q${cx + rx * k} ${cy - ry * k} ${cx + rx} ${cy}` +
    `Q${cx + rx * k} ${cy + ry * k} ${cx} ${cy + ry}` +
    `Q${cx - rx * k} ${cy + ry * k} ${cx - rx} ${cy}Z`
  );
}

// Distance from every inside pixel to the nearest outside pixel
function distanceField(inside, width, height) {
  const INFINITE = 1e12;
  const grid = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) grid[i] = inside[i] ? INFINITE : 0;

  const longest = Math.max(width, height);
  const f = new Float64Array(longest);
  const d = new Float64Array(longest);
  const v = new Int32Array(longest);
  const z = new Float64Array(longest + 1);

  const pass = (length) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INFINITE;
    z[1] = INFINITE;
    for (let q = 1; q < length; q++) {
      let s;
      do {
        const p = v[k];
        s = (f[q] + q * q - f[p] - p * p) / (2 * q - 2 * p);
      } while (s <= z[k] && --k > -1);
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INFINITE;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const p = v[k];
      d[q] = (q - p) * (q - p) + f[p];
    }
  };

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x];
    pass(height);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x];
    pass(width);
    for (let x = 0; x < width; x++) grid[y * width + x] = Math.sqrt(d[x]);
  }
  return grid;
}

function boxBlur(source, width, height, radius) {
  const horizontal = new Float32Array(width * height);
  const result = new Float32Array(width * height);
  const span = 2 * radius + 1;
  const clampX = (x) => Math.min(width - 1, Math.max(0, x));
  const clampY = (y) => Math.min(height - 1, Math.max(0, y));

  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += source[y * width + clampX(x)];
    for (let x = 0; x < width; x++) {
      horizontal[y * width + x] = sum / span;
      sum += source[y * width + clampX(x + radius + 1)] - source[y * width + clampX(x - radius)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += horizontal[clampY(y) * width + x];
    for (let y = 0; y < height; y++) {
      result[y * width + x] = sum / span;
      sum +=
        horizontal[clampY(y + radius + 1) * width + x] - horizontal[clampY(y - radius) * width + x];
    }
  }
  return result;
}

export function bakeChromeFrame(buttonWidth, buttonHeight, spikes) {
  const key = `${buttonWidth}x${buttonHeight}:${spikes}`;
  if (frames.has(key)) return frames.get(key);
  if (!chrome) {
    const chromeCanvas = paintLiquidChrome();
    chrome = {
      size: chromeCanvas.width,
      pixels: chromeCanvas
        .getContext("2d")
        .getImageData(0, 0, chromeCanvas.width, chromeCanvas.height).data,
    };
  }

  const w = buttonWidth;
  const h = buttonHeight;
  const PADDING = spikes ? PADDING_WITH_SPIKES : PADDING_RIM_ONLY;
  const width = (w + PADDING * 2) * SCALE;
  const height = (h + PADDING * 2) * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.setTransform(SCALE, 0, 0, SCALE, PADDING * SCALE, PADDING * SCALE);
  ctx.fillStyle = ctx.strokeStyle = "#fff";

  // The silhouette: rim, then the four spikes
  const radius = Math.min(CORNER_RADIUS, h / 2);
  ctx.lineWidth = 5.2;
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, radius - 1);
  ctx.stroke();
  if (spikes) {
    [
      pointPath(w / 2, -1, 5, 10),
      pointPath(w / 2, h + 1, 5, 10),
      pointPath(-1, h / 2, 10, 5),
      pointPath(w + 1, h / 2, 10, 5),
    ].forEach((path) => ctx.fill(new Path2D(path)));
  }

  // Nothing may cover the button face: this is what makes it wrap cleanly
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, radius - 3);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  const inside = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) inside[i] = pixels[i * 4 + 3] > 127 ? 1 : 0;

  // Inflate: rounded like a balloon near the edge, then level
  const distance = distanceField(inside, width, height);
  const raised = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const t = Math.min(1, distance[i] / INFLATE_DISTANCE);
    raised[i] = INFLATE_DISTANCE * Math.sqrt(1 - (1 - t) * (1 - t));
  }
  const surface = boxBlur(boxBlur(raised, width, height, 2), width, height, 1);

  // Shade each pixel from the chrome texture, using which way the surface faces
  const { size, pixels: chromePixels } = chrome;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!pixels[i * 4 + 3]) continue;
      const dx = (surface[i + 1] - surface[i - 1]) * NORMAL_STRENGTH;
      const dy = (surface[i + width] - surface[i - width]) * NORMAL_STRENGTH;
      const length = Math.hypot(dx, dy, 2);
      const u = Math.min(size - 1, ((-dx / length) * 0.5 + 0.5) * size) | 0;
      const v = Math.min(size - 1, ((-dy / length) * 0.5 + 0.5) * size) | 0;
      const texel = (v * size + u) * 4;
      pixels[i * 4] = chromePixels[texel];
      pixels[i * 4 + 1] = chromePixels[texel + 1];
      pixels[i * 4 + 2] = chromePixels[texel + 2];
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(image, 0, 0);

  const frame = {
    url: canvas.toDataURL("image/png"),
    padding: PADDING,
    width: w + PADDING * 2,
    height: h + PADDING * 2,
  };
  frames.set(key, frame);
  return frame;
}
