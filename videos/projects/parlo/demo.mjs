// Runs against a throwaway copy of Parlo with a fresh demo database. Parlo calls Anthropic from the
// browser, so the replies, corrections and report below answer those calls through Playwright. The
// account and the key are made up, and the key is entered off camera.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const USER = { name: "Alex", email: "alex@demo.example", password: "not-a-real-password-1" };
const FAKE_KEY = "sk-ant-film-fixture-not-a-real-key-0000";
const APP = "http://localhost:4112";

const PARTNER = [
  "¡Buenos días! ¿Qué te pongo?",
  "¡Marchando! ¿La tostada con tomate o con mantequilla?",
  "Lleva tomate rallado, aceite de oliva y un poco de sal. Está muy rica.",
  "Son tres euros con ochenta. ¡Gracias a ti, hasta luego!",
];
const LINES = [
  "Quiero un café con leche y un tostada, por favor.",
  "¿Qué lleva la tostada con tomate?",
  "Con tomate, entonces. ¿Cuánto es? Gracias, hasta luego.",
];
const FEEDBACK = [
  {
    verdict: "fix",
    corrected: "Quiero un café con leche y una tostada, por favor.",
    explanation: "“Tostada” is feminine, so it takes “una”, not “un”.",
    betterPhrasing: "¿Me pones un café con leche y una tostada, por favor?",
    objectivesMet: [0],
  },
  {
    verdict: "great",
    corrected: LINES[1],
    explanation: "",
    betterPhrasing: LINES[1],
    objectivesMet: [1],
  },
  {
    verdict: "good",
    corrected: LINES[2],
    explanation: "This is correct. At a bar in Spain, “¿Qué te debo?” is the more natural way to ask for the bill.",
    betterPhrasing: "Pues con tomate. ¿Qué te debo? Gracias, hasta luego.",
    objectivesMet: [2],
  },
];
const REPORT = {
  summary: "You ordered, asked about the food and paid, all in Spanish, and the barista never had to slow down for you. The one slip was noun gender in “un tostada”.",
  scores: { grammar: 74, vocabulary: 78, fluency: 82, relevance: 96 },
  strengths: ["You asked a real question about the menu: “¿Qué lleva la tostada con tomate?”", "You stayed in Spanish from the first line to the last."],
  focusAreas: ["Noun gender: “una tostada”, not “un tostada”.", "Try “¿Qué te debo?” when you ask for the bill."],
  goalsCompleted: 3,
  words: [
    { term: "la tostada", romanization: "", meaning: "toast", example: "Una tostada con tomate, por favor." },
    { term: "¿Qué te debo?", romanization: "", meaning: "what do I owe you?", example: "Perdona, ¿qué te debo?" },
    { term: "marchando", romanization: "", meaning: "coming right up", example: "¡Marchando dos cafés!" },
    { term: "rallado", romanization: "", meaning: "grated", example: "Lleva tomate rallado." },
  ],
};

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const sse = (text) => {
  const event = (name, data) => `event: ${name}\ndata: ${JSON.stringify({ type: name, ...data })}\n\n`;
  const pieces = text.match(/\S+\s*/g) ?? [];
  return [
    event("message_start", { message: { id: "msg_film", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }),
    event("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
    ...pieces.map((piece) => event("content_block_delta", { index: 0, delta: { type: "text_delta", text: piece } })),
    event("content_block_stop", { index: 0 }),
    event("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: pieces.length } }),
    event("message_stop", {}),
  ].join("");
};
const message = (value) => ({
  id: "msg_film",
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content: [{ type: "text", text: JSON.stringify(value) }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

async function answer(route) {
  const request = route.request();
  if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
  if (request.method() === "GET") {
    return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }) });
  }
  const body = JSON.parse(request.postData());
  const system = Array.isArray(body.system) ? body.system.map((b) => b.text).join("") : body.system;
  await new Promise((r) => setTimeout(r, 700));
  if (body.stream) {
    const said = body.messages.filter((m) => m.role === "assistant").length;
    return route.fulfill({ status: 200, headers: CORS, contentType: "text/event-stream", body: sse(PARTNER[Math.min(said, PARTNER.length - 1)]) });
  }
  const prompt = body.messages[0].content;
  let value;
  if (system.includes("end-of-session report")) value = REPORT;
  else value = FEEDBACK[Math.max(0, LINES.findIndex((line) => prompt.includes(line)))];
  return route.fulfill({ status: 200, headers: CORS, contentType: "application/json", body: JSON.stringify(message(value)) });
}

// Route fulfilment hands over the whole body at once, so this feeds the fixture to the app piece by
// piece, the way a real stream arrives.
const PACE_STREAM = () => {
  const real = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await real(...args);
    if (!(response.headers.get("content-type") ?? "").includes("event-stream")) return response;
    const events = (await response.text()).split(/(?<=\n\n)/);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(event));
          await new Promise((r) => setTimeout(r, 75));
        }
        controller.close();
      },
    });
    return new Response(stream, { status: response.status, headers: response.headers });
  };
};

// The film is silent and the take must make no sound on the machine recording it. System speech isn't
// covered by the browser's --mute-audio flag, so utterances report that they played without speaking.
const SILENCE = () => {
  try {
    window.localStorage.setItem("parlo:voice-engine", "system");
  } catch {
    // about:blank has no storage.
  }
  if (!("SpeechSynthesis" in window)) return;
  window.__spoken = 0;
  SpeechSynthesis.prototype.speak = function (utterance) {
    window.__spoken += 1;
    const fire = (type) => utterance.dispatchEvent(new SpeechSynthesisEvent(type, { utterance }));
    setTimeout(() => fire("start"), 0);
    setTimeout(() => fire("end"), Math.min(2500, 300 + utterance.text.length * 45));
  };
  SpeechSynthesis.prototype.cancel = function () {};
};

const psql = (input) =>
  execFileSync("docker", ["exec", "-i", "portfolio-demo-pg", "psql", "-q", "-U", "postgres", "-d", "parlo"], { input });

export default {
  title: "Parlo",
  tagline: "Practise a language by role-playing real conversations, with a correction on every line.",
  url: APP,
  viewport: { width: 1440, height: 810 },
  contextOptions: { colorScheme: "light" },
  async setup({ context }) {
    await context.route("https://api.anthropic.com/**", answer);
    // Read-aloud fetches an open-source voice model. The film is silent, so don't download it.
    await context.route(/huggingface\.co|\.hf\.co/, (route) => route.abort());
    await context.addInitScript(SILENCE);
    await context.addInitScript(PACE_STREAM);
  },
  async before(d) {
    const { page } = d;
    page.setDefaultTimeout(120000);
    psql(fs.readFileSync(new URL("./seed.sql", import.meta.url)));

    await page.goto(`${APP}/sign-up`, { waitUntil: "networkidle" });
    await page.fill('input[name="name"]', USER.name);
    await page.fill('input[name="email"]', USER.email);
    await page.fill('input[name="password"]', USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/onboarding", { timeout: 120000 });

    await page.click('button:has-text("Spanish")');
    await page.click('button:has-text("English")');
    await page.click('button:has-text("A2")');
    await page.click('button:has-text("Continue")');

    // The fake key goes in here, off camera. It's a real trip through the vault's own form.
    await page.click('button:has-text("Add your key")');
    const vault = page.frameLocator('iframe[title="Parlo key vault"]');
    await vault.locator('input[name="apiKey"]').fill(FAKE_KEY);
    await vault.locator('label:has-text("Remember on this device")').click();
    await vault.locator('button[type="submit"]').click();
    await page.waitForURL("**/app", { timeout: 120000 });

    // Compile every page the film visits, then clear the conversation this leaves behind.
    for (const path of ["/app/path", "/app/words", "/app/settings", "/app/talk"]) {
      await page.goto(`${APP}${path}`, { waitUntil: "networkidle" });
    }
    await page.click('button:has-text("Morning café")');
    await page.waitForURL("**/app/talk/*", { timeout: 120000 });
    await page.waitForSelector('button[aria-label="Type instead"]');
    await page.click('button[aria-label="Type instead"]');
    await page.waitForSelector('textarea[placeholder^="Reply in"]');
    psql("DELETE FROM parlo_conversation;");
  },
  async run(d) {
    await d.goto("/app/talk");
    await d.waitFor('button:has-text("Morning café")');
    await d.click('button:has-text("Morning café")', { popup: "You pick a scene, from ordering breakfast to a job interview, and Claude plays the other person.", after: 60 });
    await d.waitFor('button[aria-label="Type instead"]');
    await d.wait(900);
    await d.popup("A scene opens as a live voice call, with speech running in the browser and typing as the fallback.");
    // The animated orb starves the cursor glide under load, so the switch to typing is a straight cut.
    await d.cut(async () => {
      await d.page.click('button[aria-label="Type instead"]');
      await d.page.waitForSelector('textarea[placeholder^="Reply in"]');
    });
    await d.waitFor(`:text("${PARTNER[0]}")`);
    await d.wait(600);
    await d.popup("The scene's goals sit along the top and tick off as the learner meets them.", { on: 'ul[aria-label="Objectives"]' });

    await d.type('textarea[placeholder^="Reply in"]', LINES[0], { delay: 30 });
    await d.press("Enter", 300);
    await d.waitFor(`:text("${PARTNER[1]}")`);
    await d.waitFor('button:has-text("Let\'s fix this")');
    await d.wait(500);
    await d.click('button:has-text("Let\'s fix this")', { after: 700 });
    await d.popup("A separate coach reviews every line, with the fix, the reason and how a native speaker would say it.", { on: '.rounded-2xl.bg-raised:has-text("A native would say")', zoom: 1.5 });

    // Later lines appear whole, because the machine's load shouldn't decide how long a film runs.
    await d.click('textarea[placeholder^="Reply in"]', { after: 100 });
    await d.cut(() => d.page.fill('textarea[placeholder^="Reply in"]', LINES[1]));
    await d.wait(500);
    await d.press("Enter", 300);
    await d.waitFor(`:text("${PARTNER[2]}")`);
    await d.waitFor(':text("Native-level")');
    await d.wait(800);

    await d.click('textarea[placeholder^="Reply in"]', { after: 100 });
    await d.cut(() => d.page.fill('textarea[placeholder^="Reply in"]', LINES[2]));
    await d.wait(500);
    await d.press("Enter", 300);
    await d.waitFor(`:text("${PARTNER[3]}")`);
    await d.waitFor('button:has-text("Good — could be smoother")');
    await d.wait(600);
    await d.popup("Three lines in, the learner has hit all three goals, and each line got its own verdict.", { on: 'ul[aria-label="Objectives"]' });

    await d.clickThrough('button:has-text("Finish")', ':text("Session report")');
    await d.wait(1000);
    await d.page.locator('a:has-text("Next scene")').evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "end" }));
    await d.wait(1000);
    await d.popup("Finishing the scene produces a scored report on grammar, vocabulary, fluency and staying on topic.");
    await d.popup("The report quotes what the learner really said, and useful words go into a spaced-repetition deck.", { on: '.rounded-tile.border:has(:text("Added to your word bank"))', zoom: 1.5 });

    await d.goto("/app/path");
    await d.waitFor(':text("Next up")');
    await d.popup("Beyond one-off scenes there's a full pathway: six levels of courses, with quizzes and finals that unlock in order.");

    await d.goto("/app/settings");
    await d.waitFor('button:has-text("Manage key")');
    await d.click('button:has-text("Manage key")', { after: 900 });
    await d.popup("Learners bring their own Claude key, sealed in a vault on its own origin, so the app can't read it and Parlo's server never receives it.", { hold: 4400 });
  },
};
