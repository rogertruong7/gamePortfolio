// Runs against a throwaway copy of Big Shop with a fresh demo database and mock-anthropic.mjs in this
// folder. Recipes, the recipe site and all prices are fixtures; no real key or account is involved.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const USER = { name: "demo.household", password: "not-a-real-password-1" };
const FAKE_KEY = "sk-ant-film-fixture-not-a-real-key-0000";
const DISHES = "Prawn laksa, butter chicken, penne bolognese, chicken tacos, Thai red curry, lemon salmon";

const iso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};

export default {
  title: "Big Shop",
  tagline: "Plan your dinners, then see the cheapest way to buy everything for them.",
  url: "http://127.0.0.1:4111",
  addressBar: "bigshop / next fortnight",
  viewport: { width: 1440, height: 810 },
  contextOptions: { colorScheme: "light" },
  async before(d) {
    const { page } = d;
    // Each take starts as a brand-new account in the throwaway demo database.
    execFileSync("docker", ["exec", "-i", "portfolio-demo-pg", "psql", "-q", "-U", "postgres", "-d", "bigshop"], {
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
    await page.fill('input[placeholder="Next fortnight"]', "warm up");
    await page.click('button:has-text("Create plan")');
    await page.waitForURL("**/plans/*", { timeout: 120000 });
    await page.waitForSelector("#dish", { timeout: 120000 });
    const token = await page.locator('a:has-text("Open the list")').getAttribute("href");
    await page.goto(`${d.opts.url}${token}`, { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" });
    page.once("dialog", (dialog) => dialog.accept());
    await page.click('button:has-text("Delete plan")');
    await page.waitForURL("**/plans", { timeout: 60000 });
  },
  async run(d) {
    await d.goto("/plans");
    await d.waitFor('input[placeholder="Next fortnight"]');
    await d.popup("A plan covers whatever span of dates you're shopping for, at one supermarket or the cheapest of each.");
    await d.type('input[placeholder="Next fortnight"]', "Next fortnight");
    await d.cut(async () => {
      await d.page.fill('input[type="date"] >> nth=0', iso(4));
      await d.page.fill('input[type="date"] >> nth=1', iso(17));
    });
    await d.clickThrough('button:has-text("Create plan")', "#dish");

    await d.type("#dish", DISHES, { delay: 22 });
    await d.click('button:has-text("Add to plan")', { after: 900 });
    await d.waitFor(':text("Searching YouTube"), :text("Working out ingredients")');
    await d.popup("Each dinner typed in goes to Claude, which looks up a published recipe on the user's own API key.");
    await d.cut(async () => {
      await d.page.waitForFunction(() => document.querySelectorAll("#recipes img[data-loaded='true']").length >= 6, null, { timeout: 90000 });
      await d.wait(700);
    });
    await d.scroll(320);
    await d.popup("Six dishes come back with a photo, a method and calories per serve, scaled to four people.");

    await d.click('button:has(h3:has-text("Butter chicken"))', { after: 900 });
    await d.page.locator("dialog h3:has-text('Nutrition per serve')").scrollIntoViewIfNeeded();
    await d.wait(500);
    await d.popup("Calories and nutrients are added up in plain code from each ingredient, and the panel says when they're estimates.", { on: "dialog h3:has-text('Nutrition per serve')" });
    await d.click('button[aria-label="Close recipe"]', { after: 700 });

    await d.waitFor('button:has-text("Find prices for")');
    await d.page.locator('h2:has-text("Shopping list")').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "instant" }));
    await d.wait(600);
    await d.popup("The list adds up every ingredient across all six recipes in plain code, with no AI involved.", { on: 'li:has(span.strike:text-is("Chicken thigh fillet"))' });
    await d.click('button:has-text("Find prices for")', { popup: "Prices come from a web search on the user's key, because neither store offers a public price feed.", after: 1400 });
    await d.cut(async () => {
      await d.page.waitForFunction(() => !document.querySelector('[role="progressbar"]') && !/Not priced yet/.test(document.body.innerText), null, { timeout: 120000 });
      await d.wait(800);
    });
    await d.page.locator('h2:has-text("Shopping list")').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "instant" }));
    await d.wait(700);
    await d.popup("Both stores now show a total for the whole list, and the headline price takes the cheaper store for each item.", { on: '#shop p:text-matches("^\\$[0-9]")', zoom: 1.4 });
    await d.popup("Packs are chosen by arithmetic too: the cheapest mix that supplies enough of every item.", { on: 'li:has(span.strike:text-is("Chicken thigh fillet"))', zoom: 1.5 });

    const share = await d.page.locator('a:has-text("Open the list")').getAttribute("href");
    await d.goto(share);
    await d.waitFor('[role="status"]:has-text("ticked")');
    await d.popup("One link goes to the household, with no account needed, and it can't touch the plan or the API key.", { on: 'p:has-text("about $")' });
    await d.click('li:has(span.strike:text-is("Brown onion")) input[type="checkbox"]', { after: 450 });
    await d.click('li:has(span.strike:text-is("Coconut milk")) input[type="checkbox"]', { after: 450 });
    await d.click('li:has(span.strike:text-is("Garlic")) input[type="checkbox"]', { after: 450 });
    await d.popup("Everyone ticks off the same list in the supermarket, and each phone picks up the others' ticks within seconds.", { on: '[role="status"]:has-text("ticked")' });
  },
};
