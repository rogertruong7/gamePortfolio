// Real React app from a throwaway copy. Supabase and the ML service are answered by mock.mjs with
// made-up data; the demand tensors, greedy shift packing and coverage maths all run for real in the browser.
import { installMock } from "./mock.mjs";

export default {
  title: "Shiftopia",
  tagline: "A team capstone that forecasts venue staffing from booked events and drafts the shifts to cover it.",
  url: "http://127.0.0.1:4136",
  addressBar: "shiftopia / labour demand",
  viewport: { width: 1440, height: 810 },
  async setup({ context }) {
    await installMock(context);
  },
  async before(d) {
    // Compile the dev pages first so the film doesn't sit on spinners.
    await d.goto("/labor-demand");
    await d.waitFor('h1:has-text("Labor Demand Forecasting")');
  },
  async run(d) {
    await d.goto("/labor-demand");
    await d.waitFor(':text("Regional Tech Summit")');
    await d.popup("A manager picks a date, and the events booked for that day drive the forecast.", { on: ':text("1,800 attendees")' });
    await d.click('button:has-text("Select Sub")', { after: 300 });
    await d.click('[role="option"]:has-text("Front of House")', { after: 700 });
    await d.scroll(1400, 900);
    await d.clickThrough('button:has-text("Generate Shift Preview")', 'button:has-text("Confirm & Inject")', {
      popup: "One XGBoost model per role predicts headcount for every 30-minute slot of each event.",
    });
    await d.wait(400);
    await d.scroll(-1800, 900);
    await d.scroll(330, 500);
    await d.popup("Purple is predicted demand and green is the shifts already rostered, with the biggest gap flagged in red.", { on: ".recharts-wrapper", zoom: 1.25 });
    await d.scroll(520, 700);
    await d.popup("A greedy packing algorithm turns the remaining gap into whole shifts for each role.", { on: ':text("Net Hours Change")' });
    await d.scroll(900, 700);
    await d.click(d.page.locator('button:has-text("Confirm & Inject")').last(), { after: 700 });
    await d.popup("Nothing is written until the manager has reviewed the shifts and the rules they must meet.", { on: 'button:text-is("Cancel") >> nth=-1', zoom: 1.35 });
    await d.clickThrough(d.page.locator('button:has-text("Confirm & Inject")').last(), '[data-sonner-toast]:has-text("shifts added")');
    await d.popup("Each run gets its own ID, so Undo can remove any shifts from it that nobody has been assigned to.", { on: '[data-sonner-toast] button:has-text("Undo")', hold: 3000 });
    await d.clickThrough('a[href="/rosters"]', ':text("Total Shifts")');
    await d.wait(800);
    await d.popup("The new shifts land on the roster as unfilled drafts, ready to assign.", { on: ':text("Unfilled")' });
  },
};
