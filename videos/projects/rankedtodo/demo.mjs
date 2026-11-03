// Runs the real Go backend and the Expo web export from a throwaway copy, on a throwaway database.
// Each take is a fresh guest session; its made-up rank, history and todos are written below.
import { execFileSync } from "node:child_process";

const iso = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const q = (s) => `'${s.replace(/'/g, "''")}'`;

// Oldest first. [days ago, kind, done, total, delta]; the last row ends on 883 MMR (Silver 3, 83/100).
const HISTORY = [
  [8, "played", 4, 4, 25],
  [7, "played", 3, 4, 13],
  [6, "rest", 0, 0, 0],
  [5, "played", 2, 5, -5],
  [4, "played", 5, 5, 25],
  [3, "played", 1, 3, -8],
  [2, "played", 4, 4, 25],
  [1, "played", 3, 3, 25],
];

function seedSql(userId) {
  let rr = 883 - HISTORY.reduce((sum, h) => sum + h[4], 0);
  const careers = HISTORY.map(([ago, kind, done, total, delta]) => {
    const before = rr;
    rr += delta;
    return `(gen_random_uuid()::text, ${q(userId)}, ${q(iso(-ago))}, ${total}, ${done}, ${before}, ${delta}, ${rr}, ${Math.floor(before / 100)}, ${Math.floor(rr / 100)}, ${q(kind)}, now())`;
  }).join(",\n");
  const todos = [
    ["Morning run", 0],
    ["Plan meals for the week", 0],
    ["Write the shopping list", 1],
    ["Order the groceries", 1],
    ["Reply to the landlord about the lease", 0],
  ]
    .map(([text, depth], i) => `(gen_random_uuid()::text, ${q(userId)}, ${q(text)}, ${i}, ${depth}, false, now(), now())`)
    .join(",\n");
  return `
    UPDATE users SET name = 'Demo Player' WHERE id = ${q(userId)};
    UPDATE profiles SET total_rr = 883, peak_rr = 883, current_day = ${q(iso(0))} WHERE user_id = ${q(userId)};
    INSERT INTO careers (id, user_id, date, todos_total, todos_completed, rr_before, rr_delta, rr_after, rank_before, rank_after, kind, created_at) VALUES ${careers};
    INSERT INTO todos (id, user_id, text, position, depth, completed, created_at, updated_at) VALUES ${todos};
  `;
}

// The ring is the first child of the row holding the textarea with this text.
async function ring(d, text) {
  const i = await d.page.evaluate((t) => [...document.querySelectorAll("textarea")].findIndex((e) => e.value === t), text);
  if (i < 0) throw new Error(`no todo row: ${text}`);
  return d.page.locator("textarea").nth(i).locator("xpath=../div[1]");
}

export default {
  title: "RankedTodo",
  tagline: "A todo app where finishing your day moves you up a competitive ladder.",
  url: "http://127.0.0.1:4123",
  addressBar: "rankedtodo",
  viewport: { width: 390, height: 844 },
  mobile: true,
  async setup({ context }) {
    // Browsers ring a focused field; the phone app doesn't.
    await context.addInitScript(() => {
      addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style");
        st.textContent = "textarea,input{outline:none!important}";
        document.head.appendChild(st);
      });
    });
  },
  async before(d) {
    await d.goto("/");
    await d.waitFor('textarea[placeholder^="Add a task"]');
    const userId = await d.page.evaluate(() => localStorage.getItem("session.userId"));
    execFileSync("docker", ["exec", "-i", "portfolio-demo-pg", "psql", "-q", "-U", "postgres", "-d", "rankedtodo_demo", "-v", "ON_ERROR_STOP=1", "-c", seedSql(userId)]);
  },
  async run(d) {
    await d.goto("/");
    await d.waitFor('textarea[placeholder^="Add a task"]');
    await d.popup("Each day stakes 25 MMR on that day's todos, and the header shows where you'd land if the day ended now.", { on: ':text("MMR today")' });

    await d.type('textarea[placeholder^="Add a task"]', "Book the dentist");
    await d.press("Enter", 500);
    await d.popup("Adding a task feels like typing in a notes app, and the stake is shared out again straight away.", { on: ':text("MMR today")' });

    await d.click(await ring(d, "Morning run"), { after: 1100, popup: "Ticking a task earns its share of the 25 MMR, and leaving one undone costs the same." });

    await d.click(await ring(d, "Write the shopping list"), { after: 1100, popup: "Subtasks split their parent's share, so finishing one earns only part of it." });
    await d.click(await ring(d, "Plan meals for the week"), { after: 900 });
    await d.click(await ring(d, "Reply to the landlord about the lease"), { after: 700 });
    await d.click(await ring(d, "Book the dentist"), { after: 1300 });
    await d.popup("Everything is done, so today is worth the full +25, and the pale end of the bar previews where you'll land.", { on: ':text("MMR today")' });

    // The app's own day-offset clock: the same setting its developer tools use to skip to tomorrow.
    await d.cut(async () => {
      await d.page.evaluate(() => localStorage.setItem("dev.dayOffset", "1"));
    });
    await d.goto("/", { settle: 300 });
    await d.waitFor(':text("tap to continue")');
    await d.wait(900);
    await d.popup("There's no scheduled job: the first open the next day settles the day before, and crossing 900 MMR promotes you to Gold.", { hold: 3600 });
    await d.click(':text("tap to continue")', { after: 900 });
    await d.popup("The new day starts with the same list unticked, so the stake begins again.", { on: ':text("MMR today")' });

    await d.click('a[href="/career"]', { after: 1100 });
    await d.popup("The Career tab shows your total MMR, your rank and the highest rank you've reached.", { on: ':text("Peak ")' });
    await d.click('[aria-label^="History for"]', { after: 900, popup: "Every settled day is logged with its result, including rest days you never opened." });
    await d.popup("Each day's list is frozen at settlement, so a past day shows exactly what you finished.");
    await d.click(':text("‹ Back")', { after: 800 });
  },
};
