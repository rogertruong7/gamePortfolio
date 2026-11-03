// A stand-in for the Anthropic API and the public price tracker, for the portfolio film only.
// Everything here is made up: recipes, the source site, and every price.
// film.sh runs this and starts the app with ANTHROPIC_BASE_URL and CUUGO_BASE_URL pointing here.
// Every request is logged, one JSON object a line, to the file named by MOCK_LOG.
import fs from "node:fs";
import { createServer } from "node:http";

const PORT = 4110;
const log = (entry) => {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
  console.log(line);
  if (process.env.MOCK_LOG) fs.appendFileSync(process.env.MOCK_LOG, `${line}\n`);
};
const photo = (id) => `https://images.unsplash.com/photo-${id}?w=900`;
const nutrients = ([energyKj, protein, fat, saturatedFat, carbohydrate, sugars, fibre, sodium]) => ({
  energyKj, protein, fat, saturatedFat, carbohydrate, sugars, fibre, sodium,
});

// name: [category, grams per unit, isPantry, per 100 g]
const FOOD = {
  "laksa paste": ["Pantry", 1, false, [1100, 4, 22, 9, 14, 8, 3, 2900]],
  "coconut milk": ["Pantry", 1, false, [800, 2, 18, 16, 3, 2, 0, 15]],
  "chicken stock": ["Pantry", 1, false, [30, 1, 0, 0, 1, 0, 0, 340]],
  "raw prawns": ["Meat and seafood", 1, false, [370, 20, 1, 0, 0, 0, 0, 210]],
  "rice vermicelli": ["Pantry", 1, false, [1500, 6, 1, 0, 80, 0, 2, 20]],
  "bean sprouts": ["Fruit and veg", 1, false, [130, 3, 0, 0, 4, 2, 2, 6]],
  lime: ["Fruit and veg", 65, false, [120, 1, 0, 0, 8, 2, 3, 2]],
  coriander: ["Fruit and veg", 40, false, [100, 2, 1, 0, 2, 1, 3, 46]],
  "fish sauce": ["Pantry", 1.2, false, [150, 5, 0, 0, 4, 4, 0, 7800]],
  "chicken thigh fillet": ["Meat and seafood", 1, false, [720, 20, 10, 3, 0, 0, 0, 80]],
  "brown onion": ["Fruit and veg", 150, false, [170, 1, 0, 0, 8, 5, 2, 4]],
  garlic: ["Fruit and veg", 5, false, [620, 6, 1, 0, 33, 1, 2, 17]],
  ginger: ["Fruit and veg", 1, false, [330, 2, 1, 0, 18, 2, 2, 13]],
  "greek yoghurt": ["Dairy and eggs", 1, false, [400, 5, 7, 5, 4, 4, 0, 45]],
  "tomato passata": ["Pantry", 1.05, false, [150, 2, 0, 0, 6, 5, 1, 12]],
  "thickened cream": ["Dairy and eggs", 1, false, [1450, 2, 36, 23, 3, 3, 0, 30]],
  butter: ["Dairy and eggs", 1, false, [3000, 1, 81, 52, 1, 1, 0, 560]],
  "garam masala": ["Pantry", 1, true, [1400, 15, 15, 2, 45, 3, 30, 80]],
  "basmati rice": ["Pantry", 1, false, [1480, 8, 1, 0, 78, 0, 1, 1]],
  "beef mince": ["Meat and seafood", 1, false, [800, 19, 13, 6, 0, 0, 0, 65]],
  carrot: ["Fruit and veg", 120, false, [170, 1, 0, 0, 9, 5, 3, 69]],
  penne: ["Pantry", 1, false, [1520, 12, 2, 0, 72, 3, 3, 6]],
  parmesan: ["Dairy and eggs", 1, false, [1650, 35, 28, 18, 0, 0, 0, 1500]],
  "olive oil": ["Pantry", 0.9, true, [3400, 0, 100, 14, 0, 0, 0, 0]],
  "flour tortilla": ["Bakery", 45, false, [1250, 8, 7, 3, 50, 2, 3, 600]],
  avocado: ["Fruit and veg", 170, false, [670, 2, 15, 3, 1, 0, 7, 7]],
  tomato: ["Fruit and veg", 120, false, [80, 1, 0, 0, 3, 3, 1, 5]],
  "red onion": ["Fruit and veg", 150, false, [170, 1, 0, 0, 9, 4, 2, 3]],
  "sour cream": ["Dairy and eggs", 1, false, [1400, 3, 34, 21, 3, 3, 0, 40]],
  "smoked paprika": ["Pantry", 1, true, [1200, 14, 13, 2, 34, 10, 35, 68]],
  "red curry paste": ["Pantry", 1, false, [650, 3, 7, 1, 17, 9, 5, 3300]],
  "red capsicum": ["Fruit and veg", 180, false, [130, 1, 0, 0, 5, 4, 2, 4]],
  "green beans": ["Fruit and veg", 1, false, [130, 2, 0, 0, 4, 2, 3, 6]],
  "salmon fillet": ["Meat and seafood", 1, false, [860, 20, 13, 3, 0, 0, 0, 59]],
  lemon: ["Fruit and veg", 100, false, [120, 1, 0, 0, 6, 2, 3, 2]],
  "baby spinach": ["Fruit and veg", 1, false, [100, 3, 0, 0, 1, 0, 2, 79]],
  "chat potatoes": ["Fruit and veg", 1, false, [320, 2, 0, 0, 16, 1, 2, 7]],
};

// [name, quantity, unit, what the recipe says]
const RECIPES = {
  "prawn laksa": {
    title: "Prawn laksa", minutes: 40, photo: photo("1569718212165-3a8278d5f624"),
    summary: "A rich coconut noodle soup with prawns and plenty of lime.",
    steps: ["Fry the laksa paste until it smells toasty.", "Add the stock and coconut milk and simmer for 10 minutes.", "Poach the prawns in the broth until just pink.", "Soak the noodles and divide between bowls.", "Ladle over the soup and top with sprouts, coriander and lime."],
    ingredients: [["laksa paste", 200, "g", "200 g laksa paste"], ["coconut milk", 800, "ml", "2 x 400 ml tins coconut milk"], ["chicken stock", 1000, "ml", "1 L chicken stock"], ["raw prawns", 500, "g", "500 g raw prawns, peeled"], ["rice vermicelli", 250, "g", "250 g rice vermicelli"], ["bean sprouts", 200, "g", "200 g bean sprouts"], ["lime", 2, "each", "2 limes, cut into wedges"], ["coriander", 1, "each", "1 bunch coriander"], ["fish sauce", 40, "ml", "2 tbsp fish sauce"]],
  },
  "butter chicken": {
    title: "Butter chicken", minutes: 45, photo: photo("1565557623262-b51c2513a641"),
    summary: "Yoghurt-marinated chicken in a mild, buttery tomato sauce.",
    steps: ["Marinate the chicken in yoghurt, ginger and half the garam masala.", "Brown the chicken in butter and set aside.", "Soften the onion and garlic, then add the passata and simmer for 15 minutes.", "Return the chicken, stir through the cream and warm through.", "Serve over steamed basmati rice."],
    ingredients: [["chicken thigh fillet", 800, "g", "800 g chicken thigh fillets, diced"], ["brown onion", 1, "each", "1 brown onion, finely diced"], ["garlic", 4, "each", "4 cloves garlic, crushed"], ["ginger", 30, "g", "30 g ginger, grated"], ["greek yoghurt", 200, "g", "200 g Greek yoghurt"], ["tomato passata", 400, "ml", "400 ml tomato passata"], ["thickened cream", 300, "ml", "300 ml thickened cream"], ["butter", 60, "g", "60 g butter"], ["garam masala", 10, "g", "2 tsp garam masala"], ["basmati rice", 400, "g", "2 cups basmati rice"]],
  },
  "penne bolognese": {
    title: "Penne bolognese", minutes: 50, photo: photo("1621996346565-e3dbc646d9a9"),
    summary: "A slow-simmered beef and tomato sauce tossed through penne.",
    steps: ["Soften the onion, garlic and carrot in olive oil.", "Brown the mince well.", "Add the passata and simmer gently for 30 minutes.", "Boil the penne and toss through the sauce.", "Serve with parmesan."],
    ingredients: [["beef mince", 500, "g", "500 g beef mince"], ["brown onion", 1, "each", "1 brown onion, diced"], ["garlic", 3, "each", "3 cloves garlic, crushed"], ["carrot", 1, "each", "1 carrot, finely diced"], ["tomato passata", 700, "ml", "700 ml tomato passata"], ["penne", 500, "g", "500 g penne"], ["parmesan", 60, "g", "60 g parmesan, grated"], ["olive oil", 20, "ml", "1 tbsp olive oil"]],
  },
  "chicken tacos": {
    title: "Chicken tacos", minutes: 30, photo: photo("1565299585323-38d6b0865b47"),
    summary: "Smoky chicken in soft tortillas with avocado and a sharp salsa.",
    steps: ["Toss the chicken with smoked paprika and fry until charred.", "Dice the tomato and red onion with lime juice and coriander.", "Warm the tortillas in a dry pan.", "Fill with chicken, salsa, avocado and sour cream."],
    ingredients: [["chicken thigh fillet", 600, "g", "600 g chicken thigh fillets"], ["flour tortilla", 8, "each", "8 small flour tortillas"], ["avocado", 2, "each", "2 avocados, sliced"], ["tomato", 3, "each", "3 tomatoes, diced"], ["red onion", 1, "each", "1 red onion, finely diced"], ["lime", 2, "each", "2 limes"], ["coriander", 1, "each", "1 bunch coriander"], ["sour cream", 150, "g", "150 g sour cream"], ["smoked paprika", 10, "g", "2 tsp smoked paprika"]],
  },
  "thai red curry": {
    title: "Thai red curry", minutes: 30, photo: photo("1455619452474-d2be8b1e70cd"),
    summary: "A quick coconut curry with chicken, capsicum and green beans.",
    steps: ["Fry the curry paste in a little coconut milk until fragrant.", "Add the chicken and brown lightly.", "Pour in the remaining coconut milk and simmer for 10 minutes.", "Add the vegetables and cook until just tender.", "Season with fish sauce and lime, and serve with rice."],
    ingredients: [["red curry paste", 100, "g", "100 g red curry paste"], ["coconut milk", 400, "ml", "400 ml tin coconut milk"], ["chicken thigh fillet", 500, "g", "500 g chicken thigh fillets, sliced"], ["red capsicum", 2, "each", "2 red capsicums, sliced"], ["green beans", 200, "g", "200 g green beans"], ["fish sauce", 20, "ml", "1 tbsp fish sauce"], ["basmati rice", 400, "g", "2 cups basmati rice"], ["lime", 1, "each", "1 lime"]],
  },
  "lemon salmon": {
    title: "Creamy lemon salmon", minutes: 25, photo: photo("1574484284002-952d92456975"),
    summary: "Pan-fried salmon in a garlicky lemon cream, with crisp potatoes.",
    steps: ["Boil the potatoes, then crush and fry them in butter until crisp.", "Sear the salmon skin side down and set aside.", "Soften the garlic, add the cream and lemon and simmer until thick.", "Wilt the spinach through the sauce and return the salmon."],
    ingredients: [["salmon fillet", 600, "g", "4 salmon fillets, about 600 g"], ["thickened cream", 300, "ml", "300 ml thickened cream"], ["lemon", 2, "each", "2 lemons"], ["garlic", 3, "each", "3 cloves garlic, crushed"], ["baby spinach", 120, "g", "120 g baby spinach"], ["butter", 30, "g", "30 g butter"], ["chat potatoes", 800, "g", "800 g chat potatoes"]],
  },
};

// What the web search finds, for the gaps the tracker leaves at Woolworths and Coles.
// name: { pack label: [units in pack, Woolworths price or null, Coles price or null] }
const PACKS = {
  "laksa paste": { "185 g jar": [185, 4.5, 4.2], "370 g jar": [370, 7.8, 7.5] },
  "red curry paste": { "114 g jar": [114, 3.2, 3.5] },
  "fish sauce": { "200 ml bottle": [200, 3.5, 3.2] },
  "bean sprouts": { "200 g bag": [200, 2.5, 2.3] },
  "rice vermicelli": { "250 g pack": [250, 2.2, null] },
  "green beans": { "250 g bag": [250, null, 2.8] },
};

// The tracker's listings. term: [product, [size, Woolworths, Coles, ALDI, IGA], ...]. A null means
// that store isn't listed, and a term that's absent gets a results page with no cards, so the app's
// next step is real: web search at Woolworths and Coles, and no price at ALDI and IGA.
const TRACKER = {
  prawn: ["Raw Prawns", ["500g", 16, 15.5, 14.5, 17]],
  "coconut milk": ["Coconut Milk", ["400ml", 1.75, 1.9, 1.44, 2.2], ["1L", 4.8, 4.5, null, null]],
  "chicken stock": ["Chicken Stock", ["1L", 2.6, 2.4, 1.99, 3.1]],
  "rice vermicelli": ["Rice Vermicelli", ["250g", null, 2.4, 1.89, null]],
  lime: ["Limes", ["each", 0.9, 1.1, 0.79, 1.2]],
  coriander: ["Fresh Coriander", ["each", 3, 2.9, 2.49, 3.5]],
  "chicken thigh fillet": ["Chicken Thigh Fillets", ["500g", 6.5, 6.9, 6.2, 7.5], ["1kg", 12, 11.5, 11.9, 14]],
  "brown onion": ["Brown Onions", ["each", 0.6, 0.65, 0.55, 0.8], ["1kg", 2.9, 3, 2.49, 3.5]],
  garlic: ["Garlic", ["50g", 1.2, 1.3, 0.99, 1.6]],
  ginger: ["Fresh Ginger", ["100g", 1.8, 2, 1.69, 2.4]],
  "greek yoghurt": ["Greek Yoghurt", ["500g", 4, 3.8, 3.49, 4.6]],
  "tomato passata": ["Tomato Passata", ["400ml", 1.6, 1.6, null, 2.1], ["700ml", 2.24, 2.31, 2.15, 3.01]],
  "thickened cream": ["Thickened Cream", ["300ml", 2.6, 2.7, 2.35, null], ["600ml", 4.4, 4.5, 4.2, null]],
  butter: ["Salted Butter", ["250g", 4.5, 4.6, 4.29, 5.2]],
  "basmati rice": ["Basmati Rice", ["1kg", 3.2, 3.5, 2.99, 4.2]],
  "beef mince": ["Beef Mince", ["500g", 7, 6.8, 6.99, 8]],
  carrot: ["Carrots", ["each", 0.4, 0.35, 0.39, 0.5]],
  penne: ["Penne", ["500g", 1.5, 1.3, 1.25, 2.2]],
  parmesan: ["Parmesan", ["200g", 6, 6.3, 5.49, null]],
  "flour tortilla": ["Flour Tortillas", ["8pack", 3, 2.8, 2.49, 3.6]],
  avocado: ["Avocado", ["each", 2, 2.2, 1.79, 2.5]],
  tomato: ["Tomatoes", ["each", 0.9, 0.85, 0.89, 1.1]],
  "red onion": ["Red Onions", ["each", 0.8, 0.75, 0.79, 1]],
  "sour cream": ["Sour Cream", ["300g", 2.8, 2.9, 2.49, 3.4]],
  "red capsicum": ["Red Capsicum", ["each", 1.9, 2, 1.99, 2.5]],
  "green bean": ["Green Beans", ["250g", 3, null, 2.59, 3.6]],
  "salmon fillet": ["Salmon Fillets", ["280g", 12.5, 13, null, 14.5], ["560g", 23, 24, null, 27]],
  lemon: ["Lemons", ["each", 1, 0.95, 0.89, 1.3]],
  "baby spinach": ["Baby Spinach", ["120g", 3, 3.2, 2.69, 3.8]],
  "chat potato": ["Chat Potatoes", ["1kg", 3.5, 3.3, 3.29, 4.2]],
};
const STORES = [["woolworths", "Woolworths"], ["coles", "Coles"], ["aldi", "ALDI"], ["iga", "IGA"]];

/** The unit price a card prints: the app works out a pack's size from this and the shelf price. */
function unitPriceText(size, price) {
  const [, amount, unit] = /^(\d*)(kg|g|L|ml|each|pack)$/.exec(size);
  const n = Number(amount || 1);
  const money = (value) => `$${value.toFixed(2)}`;
  if (unit === "kg") return `${money(price / n)} per kg`;
  if (unit === "g") return `${money((price / n) * 1000)} per kg`;
  if (unit === "L") return `${money(price / n)} per litre`;
  if (unit === "ml") return `${money((price / n) * 1000)} per litre`;
  return `${money(price / n)} per 1ea`;
}

/** The same markup parseSearchPage in src/lib/cuugo.ts reads off a real results page. */
function trackerPage(term) {
  const [product, ...packs] = TRACKER[term] ?? [null];
  const cards = packs.flatMap(([size, ...prices]) =>
    STORES.flatMap(([id, name], index) => {
      const price = prices[index];
      if (price == null) return [];
      const label = `${name} ${product}`;
      return [
        `<div class="su-product-card"><a href="/product/${id}/${slug(`${product} ${size}`)}"><img alt="${label}" src="/fixture.png"/><h3>${label}</h3></a>` +
          `<span class="su-card-price">$${price.toFixed(2)}</span><span class="su-card-unit">${unitPriceText(size, price)}</span></div>`,
      ];
    }),
  );
  return { html: `<!doctype html><html><body><main>${cards.join("\n")}</main></body></html>`, cards: cards.length };
}

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function recipeFor(prompt) {
  const dish = (/<dish>(.*)<\/dish>/.exec(prompt)?.[1] ?? "").trim().toLowerCase();
  const r = RECIPES[dish];
  if (!r) throw new Error(`no fixture for ${dish}`);
  return {
    basedOnVideo: false,
    title: r.title,
    summary: r.summary,
    imageUrl: r.photo,
    sourceUrl: `https://www.weeknighttable.example/recipes/${slug(r.title)}`,
    sourceName: "The Weeknight Table",
    servings: 4,
    minutes: r.minutes,
    steps: r.steps,
    ingredients: r.ingredients.map(([name, quantity, unit, original]) => {
      const [category, gramsPerUnit, isPantry, per100g] = FOOD[name];
      return { name, quantity, unit, original, isPantry, category, gramsPerUnit, per100g: nutrients(per100g) };
    }),
  };
}

function pricesFor(prompt, system) {
  const items = JSON.parse(/<items>(.*)<\/items>/s.exec(prompt)[1]);
  const coles = system.includes("at Coles");
  const shop = coles ? "Coles" : "Woolworths";
  const domain = coles ? "coles.example" : "woolworths.example";
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    results: items.map((item) => ({
      itemId: item.itemId,
      options: Object.entries(PACKS[item.name.toLowerCase()] ?? {}).flatMap(([packLabel, [qty, wool, col]]) => {
        const price = coles ? col : wool;
        if (price == null) return [];
        const url = `https://${domain}/product/${slug(item.name.toLowerCase())}-${slug(packLabel)}`;
        return [{ productName: `${shop} ${title(item.name.toLowerCase())}`, packLabel, qtyInItemUnit: qty, priceAud: price, productUrl: null, sourceUrl: url, per100g: null }];
      }),
    })),
  };
}

function send(res, name, input) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  const events = [
    ["message_start", { type: "message_start", message: { id: "msg_film", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "toolu_film", name, input: {} } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(input) } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 1 } }],
    ["message_stop", { type: "message_stop" }],
  ];
  for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  res.end();
}

createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "GET" && url.pathname === "/search/r") {
    const term = url.searchParams.get("q") ?? "";
    const { html, cards } = trackerPage(term);
    log({ service: "tracker", method: "GET", path: url.pathname, term, cards });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/v1/models")) {
    log({ service: "anthropic", method: "GET", path: url.pathname, purpose: "key check" });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }));
    return;
  }
  if (req.method !== "POST" || url.pathname !== "/v1/messages") {
    log({ service: "unknown", method: req.method, path: url.pathname });
    res.writeHead(404);
    res.end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const request = JSON.parse(body);
    const tool = request.tools.at(-1).name;
    const prompt = request.messages[0].content;
    const detail = tool === "submit_prices"
      ? { store: /at (Woolworths|Coles|ALDI|IGA) in Australia/.exec(request.system)?.[1], items: JSON.parse(/<items>(.*)<\/items>/s.exec(prompt)[1]).map((item) => item.name) }
      : { dish: /<dish>(.*)<\/dish>/.exec(prompt)?.[1] };
    log({ service: "anthropic", method: "POST", path: url.pathname, tool, ...detail });
    // Long enough for the progress steps to be seen, short enough not to drag.
    const delay = tool === "submit_video" ? 900 : tool === "submit_recipe" ? 2600 : 900;
    setTimeout(() => {
      try {
        if (tool === "submit_video") send(res, tool, { urls: [] });
        else if (tool === "submit_recipe") send(res, tool, recipeFor(prompt));
        else send(res, tool, pricesFor(prompt, request.system));
      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.end();
      }
    }, delay);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`film mocks on :${PORT}`));
