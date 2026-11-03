// Records the real site from the local dev server. Analytics calls are blocked so the take
// doesn't add fake visits to the stats.
const holdUntil = async (d, keys, ready, timeout = 12000) => {
  for (const key of keys) await d.page.keyboard.down(key);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await d.page.locator(ready).first().isVisible().catch(() => false)) break;
    await d.wait(60);
  }
  for (const key of keys) await d.page.keyboard.up(key);
};

export default {
  title: "This portfolio",
  tagline: "A 3D town you walk around, where each building opens part of my portfolio.",
  url: "http://localhost:5299",
  viewport: { width: 1440, height: 810 },
  chromeArgs: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"],
  async setup({ context }) {
    await context.route("**/api/**", (route) => route.fulfill({ status: 204, body: "" }));
    await context.addInitScript(() => localStorage.setItem("visited", "true"));
  },
  async before(d) {
    await d.goto("/projects/parlo");
  },
  async run(d) {
    await d.cut(async () => {
      await d.page.goto("http://localhost:5299/", { waitUntil: "load" });
      await d.page.locator("canvas").first().waitFor({ state: "visible", timeout: 60000 });
      await d.wait(9000);
    });
    await d.popup("The site is a small 3D town built with React Three Fiber, and you walk around it with WASD or by clicking the ground.");
    await holdUntil(d, ["w", "a"], 'button:has-text("project")');
    await d.wait(400);
    await d.click('button:has-text("project")', { popup: "Standing in a doorway brings up a prompt to go inside.", after: 1500 });
    await d.page.mouse.click(720, 120); // finishes the typewriter line; the HUD's back button is top left
    await d.waitFor(':text("Parlo:")');
    await d.popup("Inside, a pixel-art librarian asks what you'd like to see, RPG style.");
    await d.click(':text("Parlo:")', { popup: "Each option opens a page, and the arrow keys work here too.", after: 1400 });
    await d.popup("Every project has a demo film and a write-up, generated from one template and two content files.");
    await d.scroll(760);
    await d.popup("The films are real click-throughs of each app, recorded by a script and composed with HyperFrames.");
  },
};
