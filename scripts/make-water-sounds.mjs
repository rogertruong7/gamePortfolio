// Synthesises the two water sounds into frontend/public/audio, so there's no licence to track.
// Change the numbers and run it again to retune them. Needs ffmpeg.
//
// Usage (run from the repo root):
//   node scripts/make-water-sounds.mjs           # both
//   node scripts/make-water-sounds.mjs wading    # just one of them

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RATE = 44100;
const AUDIO_DIR = "frontend/public/audio";
const WADING_SECONDS = 3.2;
const WADING_STEPS = 10;

const SEED = 20261105;
let seed = SEED;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

function between(low, high) {
  return low + (high - low) * random();
}

// White noise through a resonant band-pass filter, adding it to one channel of the track
function addSlosh(track, start, { seconds, attack, low, high, gain, wraps }) {
  const samples = Math.floor(seconds * RATE);
  let band = 0;
  let lowPass = 0;
  for (let i = 0; i < samples; i += 1) {
    const time = i / RATE;
    const progress = i / samples;
    // The pitch falls as the water settles
    const frequency = high + (low - high) * progress;
    const tune = 2 * Math.sin((Math.PI * frequency) / RATE);
    const noise = random() * 2 - 1;
    lowPass += tune * band;
    const highPass = noise - lowPass - 0.7 * band;
    band += tune * highPass;

    const envelope =
      Math.min(1, time / attack) * Math.exp(-time / (seconds * 0.28)) * (1 - progress);
    let at = Math.floor(start * RATE) + i;
    if (wraps) at %= track.length;
    if (at < track.length) track[at] += band * envelope * gain;
  }
}

// A rising chirp, which is what a bubble sounds like as it reaches the surface
function addBubble(track, start, { pitch, seconds, gain, wraps }) {
  const samples = Math.floor(seconds * RATE);
  let phase = 0;
  for (let i = 0; i < samples; i += 1) {
    const progress = i / samples;
    phase += (2 * Math.PI * pitch * (1 + progress * 0.6)) / RATE;
    const envelope = Math.sin(Math.PI * progress) ** 2;
    let at = Math.floor(start * RATE) + i;
    if (wraps) at %= track.length;
    if (at < track.length) track[at] += Math.sin(phase) * envelope * gain;
  }
}

// Each stride is a cluster of bubbles, which is what makes it sound like water. A burst of
// filtered noise used to go under them too, but it hissed like wet sand. They wrap around the
// end of the track, so the loop has no seam.
function wadingLoop(track) {
  const length = track.length / RATE;
  for (let step = 0; step < WADING_STEPS; step += 1) {
    const start = (step / WADING_STEPS) * length + between(-0.02, 0.02) + 0.03;
    const bubbles = 4 + Math.floor(random() * 4);
    for (let i = 0; i < bubbles; i += 1) {
      addBubble(track, start + between(0, 0.18), {
        pitch: between(320, 950),
        seconds: between(0.04, 0.1),
        gain: between(0.5, 1),
        wraps: true,
      });
    }
  }
}

// The big splash of jumping in: a heavy slap on the surface, then water closing up and bubbling
function plunge(track) {
  addSlosh(track, 0, {
    seconds: 0.9,
    attack: 0.004,
    low: 500,
    high: 3200,
    gain: 1.3,
    wraps: false,
  });
  addSlosh(track, 0.02, {
    seconds: 0.5,
    attack: 0.01,
    low: 120,
    high: 420,
    gain: 1,
    wraps: false,
  });
  for (let i = 0; i < 26; i += 1) {
    addBubble(track, between(0.12, 1.15), {
      pitch: between(350, 1100),
      seconds: between(0.03, 0.09),
      gain: between(0.04, 0.14),
      wraps: false,
    });
  }
}

function normalised(tracks, peak) {
  let loudest = 0;
  for (const track of tracks) {
    for (const sample of track) loudest = Math.max(loudest, Math.abs(sample));
  }
  return tracks.map((track) => track.map((sample) => (sample / loudest) * peak));
}

function wavFile([left, right]) {
  const dataSize = left.length * 4;
  const file = Buffer.alloc(44 + dataSize);
  file.write("RIFF", 0);
  file.writeUInt32LE(36 + dataSize, 4);
  file.write("WAVEfmt ", 8);
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(2, 22);
  file.writeUInt32LE(RATE, 24);
  file.writeUInt32LE(RATE * 4, 28);
  file.writeUInt16LE(4, 32);
  file.writeUInt16LE(16, 34);
  file.write("data", 36);
  file.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < left.length; i += 1) {
    file.writeInt16LE(Math.round(left[i] * 32767), 44 + i * 4);
    file.writeInt16LE(Math.round(right[i] * 32767), 46 + i * 4);
  }
  return file;
}

function write(name, seconds, fill) {
  if (process.argv[2] && process.argv[2] !== name) return;
  // Each sound starts from the same seed, so retuning one doesn't change the other
  seed = SEED;
  const tracks = [new Float64Array(Math.floor(seconds * RATE)), new Float64Array(Math.floor(seconds * RATE))];
  tracks.forEach(fill);

  const directory = mkdtempSync(join(tmpdir(), "water-sounds-"));
  const wav = join(directory, `${name}.wav`);
  writeFileSync(wav, wavFile(normalised(tracks, 0.85)));
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    wav,
    "-b:a",
    "128k",
    join(AUDIO_DIR, `${name}.mp3`),
  ]);
  rmSync(directory, { recursive: true });
}

write("wading", WADING_SECONDS, wadingLoop);
write("plunge", 1.4, plunge);
