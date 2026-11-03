// Run against a local copy with the fake data in seed.sql, signed in through a seeded database
// session, never the live site or a Google account.
import { execFileSync } from "node:child_process";

// Undo the previous take (the edit, the sort, the filter and the extra view).
const RESET = `
  DELETE FROM "Sort";
  DELETE FROM "Filter";
  DELETE FROM "FilterGroup" WHERE "parentGroupId" IS NOT NULL;
  DELETE FROM "View" WHERE id NOT IN ('allcustomers','gridrenewals','gridroadmap','gridevents');
  UPDATE "Cell" SET value = 'Churned' WHERE "rowId" = 'r2' AND "columnId" = 'colstatus';
  UPDATE "Base" SET "lastOpened" = now() WHERE id = 'custbase';
`;

const TABLE = "/appcustbase/tblcustomers/viwallcustomers";
const cell = (row, col) => `tbody tr:nth-child(${row}) td:nth-child(${col})`;
const ROW_HEIGHT = 32;

// Scrolls the grid to the end until `rows` rows have loaded, then returns to the top. The wheel can
// only travel as far as the rows already fetched, so this lets the filmed scroll cover thousands.
const preload = (rows) => async (d) => {
  const toEnd = (top) =>
    d.page.evaluate((t) => {
      let el = document.querySelector("tbody");
      while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
      el.scrollTop = t ?? el.scrollHeight;
      return el.scrollHeight;
    }, top);
  for (let i = 0; i < 200 && (await toEnd()) < rows * ROW_HEIGHT; i++) await d.wait(300);
  await toEnd(0);
  await d.wait(500);
};

export default {
  title: "Airtable clone",
  tagline: "A spreadsheet-database with server-side sorts and filters, tested on 100,000 rows.",
  url: "http://127.0.0.1:4121",
  addressBar: "airtable clone / customer success",
  viewport: { width: 1440, height: 810 },
  async setup({ context }) {
    await context.addCookies([
      { name: "authjs.session-token", value: "demo-session-token", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
  },
  async before(d) {
    execFileSync("docker", ["exec", "-i", "portfolio-demo-pg", "psql", "-q", "-U", "postgres", "-d", "airtable_demo", "-c", RESET]);
    await d.goto(TABLE);
    await d.waitFor(':text("100000 records")');
  },
  async run(d) {
    await d.goto("/");
    await d.waitFor(':text("Customer success")');
    await d.popup("Home lists your bases, and each base holds its own tables and views.");
    await d.clickThrough(':text("Customer success")', ':text("100000 records")');
    await d.popup("This table has 100,000 customers stored as individual cells in Postgres.", { on: ':text("100000 records")', zoom: 1.25 });

    await d.cut(() => preload(4000)(d));
    await d.hover(cell(9, 3));
    await d.scroll(60000, 2400);
    await d.popup("Only the rows on screen are in the page, so scrolling doesn't slow down as the table grows.");
    await d.scroll(66000, 2400);
    await d.popup("More rows load 500 at a time just before you reach them, using a cursor rather than an offset.");

    await d.goto(TABLE);
    await d.waitFor(':text("100000 records")');
    await d.click(cell(2, 6), { popup: "Cells work like a spreadsheet: arrow keys to move, Enter to edit, and the change saves when you leave.", zoom: 1.6 });
    await d.press("Enter", 300);
    await d.page.keyboard.type("Renewed", { delay: 70 });
    await d.wait(250);
    await d.press("Enter", 900);

    await d.click(':text-is("Sort")', { after: 500 });
    await d.click('div.z-210 div.cursor-pointer:has-text("Seats")', { after: 200 });
    await d.waitFor(':text("Sorted by 1 field")');
    await d.wait(700);
    await d.click(cell(12, 2), { after: 500 });
    await d.popup("Sorts run in the database, so all 100,000 rows are ordered, not just the ones already loaded.", { on: ':text("Sorted by 1 field")', zoom: 1.4 });

    await d.click(':text-is("Filter")', { after: 400 });
    await d.cut(async () => {
      const p = d.page;
      await p.locator('button:has-text("Add condition"):not(:has-text("group"))').first().click();
      await p.locator('input[placeholder="Enter a value"]:not([disabled])').first().waitFor({ timeout: 10000 });
      await p.locator('div.z-200 button:has-text("Name")').first().click();
      await d.wait(300);
      await p.locator('div.z-200 div.cursor-pointer:has(div:text-is("Plan"))').first().click();
      await d.wait(400);
    });
    await d.type('input[placeholder="Enter a value"]', "Enterprise");
    await d.waitFor(':text("Filtered by Plan")');
    await d.wait(900);
    await d.click(cell(12, 2), { after: 500 });
    await d.popup("Filters compile to SQL, with AND and OR groups, and the record count follows.", { on: "footer:has-text('records')", zoom: 1.25 });

    await d.click(':text("Create new...")', { after: 450 });
    await d.clickThrough('div.z-200 span:text-is("Grid")', '#views_side_menu :text("Grid 2")');
    await d.waitFor(':text("100000 records")');
    await d.popup("A new view starts clean, because each one keeps its own sorts, filters and hidden fields.", { on: '#views_side_menu :text("Grid 2")', zoom: 1.4 });
    await d.clickThrough('#views_side_menu :text("All customers")', ':text("Filtered by Plan")');
    await d.wait(1200);
    await d.popup("Switching back restores the sorted, filtered view exactly as it was saved.");
  },
};
