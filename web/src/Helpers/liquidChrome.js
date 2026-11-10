// The liquid chrome look shared by the button frames and the floating labels.
// Painted once, then reused.

let painted = null;

function wave(baseline, amplitude, frequency, phase) {
  return (x) => baseline + amplitude * Math.sin((x / 512) * Math.PI * 2 * frequency + phase);
}

// Liquid chrome: hard black and white reflections around a wavy horizon
export function paintLiquidChrome() {
  if (painted) return painted;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, 280);
  sky.addColorStop(0, "#ffffff");
  sky.addColorStop(0.55, "#dfe5ef");
  sky.addColorStop(1, "#7f8797");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 512);

  const fillBelow = (edge, paint) => {
    ctx.beginPath();
    ctx.moveTo(0, 512);
    for (let x = 0; x <= 512; x += 4) ctx.lineTo(x, edge(x));
    ctx.lineTo(512, 512);
    ctx.closePath();
    ctx.fillStyle = paint;
    ctx.fill();
  };

  fillBelow(wave(232, 26, 1.5, 0.6), "#07080c");
  const ground = ctx.createLinearGradient(0, 280, 0, 512);
  ground.addColorStop(0, "#ffffff");
  ground.addColorStop(0.32, "#c6ccd8");
  ground.addColorStop(0.62, "#4c5362");
  ground.addColorStop(1, "#0b0c11");
  fillBelow(wave(286, 22, 1.2, 2.4), ground);
  fillBelow(wave(404, 14, 2.1, 1), "#10121a");
  fillBelow(wave(438, 12, 1.7, 3), "#aeb5c3");

  const highlight = ctx.createRadialGradient(170, 120, 4, 170, 120, 100);
  highlight.addColorStop(0, "rgba(255,255,255,1)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.fillRect(0, 0, 512, 512);

  painted = canvas;
  return painted;
}
