// Runs against a throwaway copy of Markaway on a local SQLite file, with no Anthropic key, so the
// app's own demo marker answers instead of Claude. The teacher, class and sample papers are made up.
// The copy's demo marker got small tidy-ups before filming: spaces between its streamed thoughts, and
// the mark points on sample question 3 reordered so Jack's one mark doesn't credit his wrong factors.
const APP = "http://localhost:4113";
const TEACHER = { lastName: "Hart", school: "Demo High School", password: "not-a-real-password-1" };

export default {
  title: "Markaway",
  tagline: "AI-assisted marking where the teacher approves or changes every mark.",
  url: APP,
  viewport: { width: 1440, height: 810 },
  contextOptions: { colorScheme: "light" },
  async before(d) {
    const { page } = d;
    page.setDefaultTimeout(60000);

    // A new account each take, so the desk starts empty. Sign-up and the class happen off camera.
    await page.goto(`${APP}/onboarding`, { waitUntil: "networkidle" });
    await page.click('button:text-is("Mathematics")');
    await page.fill("#topic", "Year 10 — Quadratics");
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Mathematics K–10")');
    await page.click('button:has-text("Continue")');
    await page.click("#title");
    await page.click('[role="option"]:has-text("Ms")');
    await page.fill("#lastName", TEACHER.lastName);
    await page.fill("#school", TEACHER.school);
    await page.fill("#email", `teacher.${Date.now()}@demo.example`);
    await page.fill("#password", TEACHER.password);
    await page.click('button:has-text("Create account")');
    await page.waitForURL("**/dashboard");

    await page.goto(`${APP}/classrooms/new`, { waitUntil: "networkidle" });
    await page.fill("#name", "10 Mathematics A");
    await page.click('button:has-text("Students")');
    await page.click('button:has-text("Create class")');
    await page.waitForURL((url) => !url.pathname.endsWith("/new"));
    await page.goto(`${APP}/dashboard`, { waitUntil: "networkidle" });
  },
  async run(d) {
    const { page } = d;
    await d.goto("/dashboard");
    await d.waitFor('button[aria-label="Load sample worksheet"]');
    await d.popup("A teacher brings a task sheet, marking criteria and one scan per student, and this run uses a built-in sample class set.", {
      on: 'button[aria-label="Load sample worksheet"]',
      hold: 4200,
    });
    await d.click('button[aria-label="Load sample worksheet"]', { after: 600 });
    await d.waitFor("#sample-classroom");
    await d.cut(async () => {
      await page.click("#sample-classroom");
      await page.click('[role="option"]:has-text("10 Mathematics A")');
      await d.wait(500);
    });
    await d.clickThrough('button:has-text("Load worksheet")', 'button:has-text("Mark 3 papers")');
    await d.wait(700);

    await d.popup("The scheme gives each question one mark point per mark, so the marker has to rule on every point and not just give a total.", {
      on: 'section[aria-label="Questions"] details >> nth=0',
      zoom: 1.5,
      hold: 3800,
    });

    await d.click('button:has-text("Mark 3 papers")', { after: 500 });
    await d.clickThrough('button:text-is("Test run")', 'button:has-text("Jack Nguyen")');
    await d.clickThrough('button:has-text("Jack Nguyen")', 'button:has-text("Next question")');
    await d.wait(1100);
    await d.popup("A test run marks one paper in front of the teacher with its reasoning streaming in, and none of it counts towards real marks.", { hold: 3800 });

    await d.cut(async () => {
      const here = page.url().split("/trial")[0];
      await page.goto(here, { waitUntil: "networkidle" });
    });
    await d.waitFor('button:has-text("Mark 3 papers")');
    await d.click('button:has-text("Mark 3 papers")', { after: 900 });
    await d.popup("Marking the class goes through a background queue, because a real paper can take over a minute to mark.", {
      on: 'section[aria-label="Marking progress"]',
    });
    await d.waitFor('a[href$="/review"]', 120000);
    await d.wait(500);

    await d.clickThrough('a[href$="/review"]', 'button:has-text("Start review")');
    await d.clickThrough('button:has-text("Start review")', 'button:has-text("Approve")');
    await d.wait(900);
    await d.popup("Each mark opens with the section highlighted on the student's paper, beside the reasoning and a verdict per mark point.", {
      on: "aside",
      hold: 3800,
    });
    await d.popup("One key approves a mark and moves on, and every mark still passes under the teacher's eye.", {
      on: 'button:has-text("Approve")',
    });
    // Amelia's five questions, then Jack's first two, landing on his sign error.
    for (let i = 0; i < 7; i++) await d.press("ArrowRight", 400);
    await d.waitFor('header:has-text("Paper 2 of 3 · Section 3 of 5")');
    await d.wait(700);
    await d.popup("When the marker finds a mistake it names it, here a sign error with the right factorisation beside it.", {
      on: 'aside .rounded-md:has(:text("Error found"))',
      zoom: 1.5,
    });
    await d.click('button:has-text("Change marks")', { after: 900 });
    await d.waitFor("#change-marks");
    await d.click('[role="dialog"] label:has(input[type="checkbox"]) >> nth=1', { after: 300 });
    await d.cut(() => page.fill("#change-marks", "2"));
    await d.wait(300);
    await d.popup("The teacher has the last word: tick the lines that earn marks, set the total or draw on the paper, and the AI's mark stays on record.", { hold: 4000 });
    await d.click('[role="dialog"] button:has-text("Save marks")', { after: 900 });

    // The rest of the class set goes through off camera.
    await d.cut(async () => {
      while (!(await page.locator('header :text-is("15/15")').count())) await d.press("ArrowRight", 220);
      await d.press("ArrowRight", 300);
      await page.waitForURL((url) => !url.pathname.endsWith("/review"));
      await page.waitForSelector('h2:has-text("Results")');
      await d.wait(600);
      await page.locator('h2:has-text("Results")').evaluate((el) => el.scrollIntoView({ block: "start" }));
      await d.wait(600);
    });
    await d.popup("The summary shows every student's marks by question, with the AI's total beside the final one and a CSV export.", {
      on: "table",
      zoom: 1.25,
      hold: 3600,
    });
    await page.locator('article:has(h3:has-text("Jack Nguyen"))').evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    await d.wait(1200);
    await d.popup("Papers come back with red ticks on the lines that earned marks, ready to print or save as a PDF.", { hold: 3400 });
  },
};
