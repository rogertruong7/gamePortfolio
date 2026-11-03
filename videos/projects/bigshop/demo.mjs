// Runs against a throwaway copy of the app with a fresh demo database and mock-anthropic.mjs in this
// folder. Recipes, the recipe site and all prices are fixtures; no real key or account is involved.
// Run it through film.sh, which sets all of that up.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const USER = { name: "demo.household", password: "not-a-real-password-1" };
const FAKE_KEY = "sk-ant-film-fixture-not-a-real-key-0000";
const DISHES = "Prawn laksa, butter chicken, penne bolognese, chicken tacos, Thai red curry, lemon salmon";
// Only the app and the food photos. Anything else the browser asks for is refused and logged.
const BROWSER_ALLOWS = new Set(["127.0.0.1", "images.unsplash.com"]);

const iso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};
const row = (name) => `li:has(span.strike:text-is("${name}"))`;
const NAME_FIELD = 'input[placeholder="Next fortnight"]';
const STORE = (name) => `#shop label:has-text("${name}")`;

// Glides the page until the target sits this far from the top of the window.
async function scrollTo(d, target, top = 110) {
  const y = await d.page.locator(target).first().evaluate((el) => el.getBoundingClientRect().top);
  await d.scroll(y - top, 500);
}

export default {
  title: "F***Woolies",
  tagline: "Plan your dinners, then see the cheapest way to buy everything for them.",
  url: "http://127.0.0.1:4111",
  viewport: { width: 1440, height: 810 },
  contextOptions: { colorScheme: "light" },
  async setup({ context }) {
    await context.route("**/*", (route) => {
      const { hostname } = new URL(route.request().url());
      const allowed = BROWSER_ALLOWS.has(hostname);
      if (process.env.FILM_BROWSER_LOG) {
        fs.appendFileSync(process.env.FILM_BROWSER_LOG, `${JSON.stringify({ host: hostname, allowed })}\n`);
      }
      return allowed ? route.continue() : route.abort();
    });
  },
  async before(d) {
    const { page } = d;
    // Each take starts as a brand-new account in the throwaway demo database.
    execFileSync("docker", ["exec", "-i", "portfolio-demo-pg", "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "bigshop"], {
      input: fs.readFileSync(new URL("./seed.sql", import.meta.url)),
    });
    page.setDefaultTimeout(120000);
    await page.goto(`${d.opts.url}/signin?mode=signup`, { waitUntil: "networkidle" });
    await page.fill('input[name="username"]', USER.name);
    await page.fill('input[name="password"]', USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/plans", { timeout: 120000 });

    // Off camera: the fake key goes in here, and the plan page gets compiled once.
    await page.goto(`${d.opts.url}/settings`, { waitUntil: "networkidle" });
    await page.fill('input[name="anthropic-key"]', FAKE_KEY);
    await page.click('button:has-text("Check and save key")');
    await page.waitForSelector(':text("Key ending")', { timeout: 60000 });

    await page.goto(`${d.opts.url}/plans`, { waitUntil: "networkidle" });
    await page.fill(NAME_FIELD, "warm up");
    await page.click('button:has-text("Create plan")');
    await page.waitForURL("**/plans/*", { timeout: 120000 });
    await page.waitForSelector("#dish", { timeout: 120000 });
    const list = await page.locator('a:has-text("Open the list")').getAttribute("href");
    await page.goto(`${d.opts.url}${list}`, { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" });
    page.once("dialog", (dialog) => dialog.accept());
    await page.click('button:has-text("Delete plan")');
    await page.waitForURL("**/plans", { timeout: 60000 });
  },
  async run(d) {
    // Creating the plan.
    await d.goto("/plans");
    await d.waitFor(NAME_FIELD);
    await d.type(NAME_FIELD, "Next fortnight");
    await d.cut(async () => {
      await d.page.fill('input[type="date"] >> nth=0', iso(4));
      await d.page.fill('input[type="date"] >> nth=1', iso(17));
      await d.page.evaluate(() => document.activeElement?.blur());
    });
    await d.popup("A plan covers the dates you're shopping for, at one supermarket or the cheapest of each.", { on: "form fieldset" });
    await d.clickThrough('button:has-text("Create plan")', "#dish");

    // Dishes in, recipes back.
    await d.type("#dish", DISHES, { delay: 22 });
    await d.clickThrough('button:has-text("Add to plan")', ':text("Searching YouTube")');
    await d.wait(1000);
    await d.cut(async () => {
      await d.page.waitForFunction(() => document.querySelectorAll("#recipes img[data-loaded='true']").length >= 6, null, { timeout: 120000 });
      await d.wait(700);
    });
    await d.scroll(320, 500);
    await d.popup("Claude finds a published recipe for each dish, with a photo, on the user's own API key.");

    // One recipe's nutrition.
    await d.click('button:has(h3:has-text("Butter chicken"))', { after: 600 });
    await d.page.locator("dialog h3:has-text('Nutrition per serving')").scrollIntoViewIfNeeded();
    await d.wait(250);
    await d.popup("Nutrition is added up in plain code from each ingredient, and the panel says when the figures are estimates.", { on: "dialog section > p" });
    await d.click('button[aria-label="Close recipe"]', { after: 400 });

    // The merged list.
    await d.waitFor('button:has-text("Find prices for")');
    await scrollTo(d, row("Chicken thigh fillet"), 300);
    await d.popup("Ingredients from all six recipes merge through a dictionary and plain arithmetic, with no AI involved.", { on: row("Chicken thigh fillet") });

    // Pricing.
    await scrollTo(d, 'h2:has-text("Shopping list")', 90);
    await d.click('button:has-text("Find prices for")', {
      popup: "Prices try a 7-day catalogue first, then a public price tracker, then a web search at Woolworths and Coles only.",
      hold: 4000,
      after: 900,
    });
    await d.cut(async () => {
      await d.page.waitForFunction(() => !document.querySelector('[role="progressbar"]') && !/Not priced yet/.test(document.body.innerText), null, { timeout: 240000 });
      await d.page.evaluate(() => {
        const heading = [...document.querySelectorAll("h2")].find((el) => el.textContent === "Shopping list");
        window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 90, behavior: "instant" });
      });
      await d.wait(900);
    });
    await d.popup("The headline buys each item at whichever of the four stores is cheapest, and each store shows its own total.", { on: d.page.locator("#shop p").filter({ hasText: /^\$\d/ }), zoom: 1.3 });

    // A gap the web search filled, and the cheapest packs, on rows that sit together.
    await scrollTo(d, row("Red curry paste"), 170);
    await d.popup("The price tracker doesn't list this item, so a web search on the user's key filled the gap.", { on: row("Red curry paste"), zoom: 1.4 });
    await d.popup("Packs are chosen by arithmetic too: here, one of each size is the cheapest way to get enough.", { on: row("Tomato passata"), zoom: 1.4 });

    // A gap that stays a gap.
    await scrollTo(d, 'h2:has-text("Shopping list")', 90);
    await d.click(STORE("ALDI"), { after: 700 });
    await d.popup("ALDI and IGA have no web search, so anything the tracker doesn't list stays marked as unpriced.", { on: '#shop p:has-text("not in this total")' });

    // The shared list. The plan goes back to the cheapest of each off camera, and that's what it shows.
    const share = await d.page.locator('a:has-text("Open the list")').getAttribute("href");
    await d.cut(async () => {
      await d.page.locator(STORE("Cheapest of each")).click();
      await d.wait(1500);
    });
    await d.goto(share);
    await d.waitFor('[role="status"]:has-text("ticked")');
    const tick = (n) => `main li input[type="checkbox"] >> nth=${n}`;
    await d.click(tick(0), { after: 400 });
    await d.click(tick(1), { after: 400 });
    await d.popup("Anyone with the link can tick the same list without an account, but can't change the plan or use the API key.", { on: '[role="status"]:has-text("ticked")' });
  },
};
