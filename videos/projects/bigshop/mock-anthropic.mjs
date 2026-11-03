// A stand-in for the Anthropic API with realistic fixtures, for the portfolio film only.
// Everything here is made up: recipes, the source site, and every price.
// Run: node projects/bigshop/mock-anthropic.mjs   then start Big Shop with ANTHROPIC_BASE_URL=http://127.0.0.1:4110
import { createServer } from "node:http";

const PORT = 4110;
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

// name: { pack label: [units in pack, Woolworths price, Coles price] }, all made up for the film.
const PACKS = {
  "laksa paste": { "185 g jar": [185, 4.5, 4.2], "370 g jar": [370, 7.8, 7.5] },
  "coconut milk": { "400 ml tin": [400, 1.75, 1.9], "1 L carton": [1000, 4.8, 4.5] },
  "chicken stock": { "1 L carton": [1000, 2.6, 2.4] },
  "raw prawns": { "500 g pack": [500, 16, 15.5] },
  "rice vermicelli": { "250 g pack": [250, 2.2, 2.4] },
  "bean sprouts": { "200 g bag": [200, 2.5, 2.3] },
  lime: { "each": [1, 0.9, 1.1], "500 g bag": [8, 5, 4.5] },
  coriander: { "bunch": [1, 3, 2.9] },
  "fish sauce": { "200 ml bottle": [200, 3.5, 3.2] },
  "chicken thigh fillet": { "500 g tray": [500, 6.5, 6.9], "1 kg tray": [1000, 12, 11.5] },
  "brown onion": { "each": [1, 0.6, 0.65], "1 kg bag": [7, 2.9, 3] },
  garlic: { "single bulb": [10, 1.2, 1.3], "3 pack": [30, 3, 2.9] },
  ginger: { "100 g piece": [100, 1.8, 2] },
  "greek yoghurt": { "500 g tub": [500, 4, 3.8] },
  "tomato passata": { "700 ml bottle": [700, 2.2, 2.3], "400 ml jar": [400, 1.6, 1.5] },
  "thickened cream": { "300 ml tub": [300, 2.6, 2.7], "600 ml tub": [600, 4.4, 4.5] },
  butter: { "250 g block": [250, 4.5, 4.6] },
  "basmati rice": { "1 kg bag": [1000, 3.2, 3.5] },
  "beef mince": { "500 g tray": [500, 7, 6.8] },
  carrot: { "each": [1, 0.4, 0.35] },
  penne: { "500 g pack": [500, 1.5, 1.3] },
  parmesan: { "200 g wedge": [200, 6, 6.3] },
  "flour tortilla": { "8 pack": [8, 3, 2.8] },
  avocado: { "each": [1, 2, 2.2] },
  tomato: { "each": [1, 0.9, 0.85] },
  "red onion": { "each": [1, 0.8, 0.75] },
  "sour cream": { "300 g tub": [300, 2.8, 2.9] },
  "red curry paste": { "114 g jar": [114, 3.2, 3.5] },
  "red capsicum": { "each": [1, 1.9, 2] },
  "green beans": { "250 g bag": [250, 3, 2.8] },
  "salmon fillet": { "2 pack, 280 g": [280, 12.5, 13], "4 pack, 560 g": [560, 23, 24] },
  lemon: { "each": [1, 1, 0.95] },
  "baby spinach": { "120 g bag": [120, 3, 3.2] },
  "chat potatoes": { "1 kg bag": [1000, 3.5, 3.3] },
};

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
  const domain = coles ? "www.coles.com.au" : "www.woolworths.com.au";
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    results: items.map((item) => ({
      itemId: item.itemId,
      options: Object.entries(PACKS[item.name.toLowerCase()] ?? {}).map(([packLabel, [qty, wool, col]]) => ({
        productName: `${shop} ${title(item.name.toLowerCase())}`,
        packLabel,
        qtyInItemUnit: qty,
        priceAud: coles ? col : wool,
        productUrl: `https://${domain}/product/${slug(item.name.toLowerCase())}-${slug(packLabel)}`,
        sourceUrl: `https://${domain}/product/${slug(item.name.toLowerCase())}-${slug(packLabel)}`,
        per100g: null,
      })),
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
  if (req.method === "GET" && req.url.startsWith("/v1/models")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data: [], has_more: false, first_id: null, last_id: null }));
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const request = JSON.parse(body);
    const tool = request.tools.at(-1).name;
    const prompt = request.messages[0].content;
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
}).listen(PORT, "127.0.0.1", () => console.log(`film mock on :${PORT}`));
