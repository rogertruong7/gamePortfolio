// Real React frontend from a throwaway copy, with its API host repointed to presto-api.demo.invalid
// so it can't reach the deployed backend. These routes copy backend/api/index.js: a per-user JSON store.
const API = "https://presto-api.demo.invalid";
const thumb = (a, b) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="180" height="180" fill="url(#g)"/></svg>`)}`;
const slide = (slideNumber) => ({ texts: [], images: [], codes: [], videos: [], slideNumber, theme: "" });
const store = {
  presentations: [
    { id: "deck-1", name: "Team offsite plan", description: "Agenda, venues and budget for the spring offsite.", thumbnail: thumb("#7F7FD5", "#91EAE4"), numSlides: 6, slides: [1, 2, 3, 4, 5, 6].map(slide), defaultTheme: "" },
    { id: "deck-2", name: "Intro to web accessibility", description: "A short talk on keyboard use and screen readers.", thumbnail: thumb("#F2994A", "#F2C94C"), numSlides: 4, slides: [1, 2, 3, 4].map(slide), defaultTheme: "" },
  ],
};
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const json = (route, body, status = 200) => route.fulfill({ status, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify(body) });

const code = `# Split, sort each half, then merge
def merge_sort(items):
    if len(items) <= 1:
        return items
    mid = len(items) // 2
    left = merge_sort(items[:mid])
    right = merge_sort(items[mid:])
    return merge(left, right)`;

// Sets a Material UI slider off camera by clicking part way along its track.
async function setSlider(d, label, frac) {
  const b = await d.page.locator(`.MuiSlider-root:has(input[aria-label="${label}"])`).first().boundingBox();
  await d.page.mouse.click(b.x + b.width * frac, b.y + b.height / 2);
}

// d.click with a shorter cursor glide, so the film stays under a minute even on a busy machine.
async function tap(d, target, { popup, zoom = 1, after = 300 } = {}) {
  const b = await d.box(target);
  await d.moveTo(b.x + b.width / 2, b.y + b.height / 2, 200);
  if (popup) await d.popup(popup, { on: target, zoom });
  const box = await d.box(target);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  d.events.push({ type: "click", t: d.now(), x, y });
  await d.page.mouse.down();
  await d.wait(60);
  await d.page.mouse.up();
  await d.wait(after);
}

async function tapThrough(d, target, ready) {
  await tap(d, target, { after: 40 });
  await d.waitFor(ready);
}

export default {
  title: "Presto",
  tagline: "A slide deck editor in the browser, with text, images, video and highlighted code.",
  url: "http://127.0.0.1:4135",
  viewport: { width: 1440, height: 810 },
  async setup({ context }) {
    await context.route(`${API}/**`, async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      if (path === "/admin/auth/login" || path === "/admin/auth/register") return json(route, { token: "demo-token" });
      if (path === "/admin/auth/logout") return json(route, {});
      if (path === "/store" && req.method() === "GET") return json(route, { store });
      if (path === "/store" && req.method() === "PUT") {
        store.presentations = req.postDataJSON().store.presentations;
        return json(route, {});
      }
      return json(route, { error: "Not found" }, 404);
    });
  },
  async before(d) {
    // Signed in off camera, so the film opens on the dashboard.
    await d.goto("/login");
    await d.page.fill("#login__email__input", "sam@example.com");
    await d.page.fill("#login__password__input", "demo-pass");
    await d.page.click('button:has-text("Login")');
    await d.page.waitForSelector("text=Recent presentations");
    await d.wait(900);
  },
  async run(d) {
    await d.popup("Presto is a slide editor built with React, and the dashboard lists every deck you own.");
    await tap(d, 'button:has-text("+ New Presentation")', { after: 200 });
    await tap(d, 'input[placeholder="Title your presentation"]', { after: 80 });
    await d.page.keyboard.type("Sorting in five minutes", { delay: 18 });
    await d.wait(150);
    await tapThrough(d, 'button:has-text("Create")', 'b:has-text("Sorting in five minutes")');
    await tapThrough(d, 'b:has-text("Sorting in five minutes")', 'button:has-text("+ Text")');
    const deckId = new URL(d.page.url()).pathname.split("/")[1];

    await tap(d, 'button:has-text("+ Text")', { popup: "The toolbar adds text, images, video and code to the slide.", after: 200 });
    await d.cut(async () => {
      await setSlider(d, "Height", 0.3);
      await setSlider(d, "Width", 0.72);
    });
    await tap(d, "form textarea:not([aria-hidden])", { after: 80 });
    await d.page.keyboard.type("How merge sort works", { delay: 18 });
    await d.wait(150);
    await d.cut(() => setSlider(d, "Font Size", 0.55));
    await tapThrough(d, 'button:has-text("Apply")', 'div:text("How merge sort works")');
    await d.wait(300);

    await tap(d, 'button:has-text("Change Theme")', { after: 200 });
    await tap(d, 'label:has-text("Gradient") input', { after: 200 });
    await d.cut(async () => {
      await d.page.locator(".MuiInputBase-input").nth(0).fill("#1B3A9C");
      await d.page.locator(".MuiInputBase-input").nth(1).fill("#86CDEB");
    });
    await d.popup("A theme can be a solid colour, a gradient or an image, for one slide or the whole deck.", { on: 'button:text-is("Apply")' });
    await tap(d, 'button:text-is("Apply")', { after: 800 });

    await tap(d, 'button:has-text("+ New Slide")', { after: 250 });
    await tap(d, 'button:text-is(">")', { after: 250 });
    await tap(d, 'button:has-text("+ Code")', { after: 200 });
    await d.cut(async () => {
      await setSlider(d, "Height", 0.68);
      await setSlider(d, "Width", 0.85);
      await d.page.locator("form textarea:not([aria-hidden])").first().click();
      await d.page.keyboard.insertText(code);
      await setSlider(d, "Font Size", 0.31);
    });
    await tapThrough(d, 'button:has-text("Apply")', 'code:has-text("merge_sort")');
    await d.wait(300);
    await d.popup("Code blocks detect their own language and highlight themselves.", { on: 'code:has-text("merge_sort")', zoom: 1.4 });

    await d.hover('code:has-text("merge_sort")');
    await d.page.mouse.dblclick(d.mouse.x, d.mouse.y, { delay: 40 });
    await d.waitFor(':text("x-Position")');
    await d.cut(() => d.page.evaluate(() => getSelection().removeAllRanges()));
    await d.popup("Double-clicking an element reopens its settings, with size and position set as a percentage of the slide.");
    await d.cut(async () => {
      await setSlider(d, "x-Position", 0.07);
      await setSlider(d, "y-Position", 0.14);
    });
    await tap(d, 'button:text-is("Apply")', { after: 700 });

    await d.hover('button:has-text("Preview")');
    await d.goto(`/${deckId}/preview/1`);
    await d.waitFor('div:text("How merge sort works")');
    await d.wait(700);
    await d.press("ArrowRight", 500);
    await d.popup("Preview presents the deck on its own page, and the arrow keys step through the slides.");
    await d.wait(200);
  },
};
