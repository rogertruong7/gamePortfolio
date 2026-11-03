// Real frontend and real Rust scorer, built from a throwaway copy. Nothing is mocked.
export default {
  title: "Balatro Clone",
  tagline: "A Rust engine that scores one round of Balatro, with a small web page to set up the round.",
  url: "http://127.0.0.1:4131",
  addressBar: "balatro score calculator",
  viewport: { width: 1440, height: 810 },
  async run(d) {
    await d.goto("/");
    await d.waitFor("#deck .deck-card");
    await d.popup("This page builds a round of Balatro and sends it to a scoring engine written in Rust.", { hold: 2900 });
    await d.click('#deck .deck-card.hearts:has-text("K")', { popup: "Pick up to five cards from the deck to play.", after: 250 });
    await d.click('#deck .deck-card.spades:has-text("Q")', { after: 120 });
    await d.click('#deck .deck-card.diamonds:has-text("J")', { after: 120 });
    await d.click('#deck .deck-card.clubs:has-text("10")', { after: 120 });
    await d.click('#deck .deck-card.hearts:has-text("9")', { after: 200 });
    await d.click('.target-btn[data-target="held"]', { popup: "Cards left in hand matter too, because some jokers score from them.", after: 300 });
    await d.click('#deck .deck-card.spades:has-text("K")', { after: 250 });
    await d.scroll(620, 700);
    await d.click('#played-cards .hand-card:has-text("K")', { popup: "Any card can carry an enhancement or an edition.", hold: 1800, after: 400 });
    await d.click('#edition-buttons .mod-btn:has-text("Polychrome")', { after: 150 });
    await d.click('#modifier-panel .btn-primary', { after: 300 });
    await d.scroll(300, 500);
    await d.click('.joker-btn:has-text("Sock And Buskin")', { popup: "Jokers change the score in the order they sit, so the engine applies each one in sequence.", hold: 3000, after: 150 });
    await d.click('.joker-btn:has-text("Scary Face")', { after: 150 });
    await d.click('.joker-btn:has-text("Baron")', { after: 250 });
    await d.scroll(-1000, 700);
    await d.click('.score-display .btn-primary', { after: 700 });
    await d.popup("Calculate posts the round to the Rust binary as YAML, and this is its answer: chips times mult.", { on: "#score", zoom: 1.5 });
    await d.hover("#explanation");
    await d.popup("Explain mode lists every step, including each retrigger and joker effect.", { on: "#explanation", zoom: 1.6 });
    await d.scroll(260, 800);
  },
};
