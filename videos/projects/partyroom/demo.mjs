// Run against a local copy with the fake data in seed.sql, never the live party.
export default {
  title: "Partyroom",
  tagline: "Scan a QR code at the door, get dealt onto a team.",
  url: "http://127.0.0.1:4101",
  addressBar: "partyroom / rooftop birthday",
  viewport: { width: 1280, height: 720 },
  async before(d) {
    // Compile the dev pages first so the film doesn't sit on spinners.
    await d.goto("/p/rooftop");
    await d.waitFor('button:has-text("guest list")');
  },
  async run(d) {
    await d.goto("/p/rooftop");
    await d.waitFor('button:has-text("guest list")');
    await d.popup("A guest scans the QR code at the door and lands here.");
    await d.click('button:has-text("guest list")', { popup: "No app and no password. Just say who you are." });
    await d.type('input[aria-label="Search for a name"]', "Sam");
    await d.click('[role="option"]:has-text("Sam Rivers")', { popup: "Names come from the host's guest list." });
    await d.clickThrough('button:has-text("That’s me")', 'button:has-text("Yes, I’m here")');
    await d.click('button:has-text("Yes, I’m here")', { popup: "Teams are only dealt once you're actually at the venue, so no-shows don't unbalance them.", after: 1800 });
    await d.popup("Dealt onto a team. A new arrival joins their friend's team, otherwise the smallest one.", {});
    await d.click('button:has-text("On it")', { after: 900 });
    await d.scroll(620);
    await d.popup("Then the page becomes the night's itinerary, team list and shared photo album.");
    await d.goto("/admin");
    await d.type('input[type="password"]', "demodemo");
    await d.cut(() => d.press("Enter", 1200));
    await d.waitFor(':text("Rooftop Birthday")');
    await d.click(':text("Rooftop Birthday")', { popup: "The host has a password-protected dashboard.", after: 1800 });
    await d.popup("Live numbers: who's going, who's here and how the teams are shaping up.");
    await d.click('[role="tab"]:has-text("Teams")', { after: 1500 });
    await d.popup("The host can see every team and rebalance them if the room gets lopsided.");
  },
};
