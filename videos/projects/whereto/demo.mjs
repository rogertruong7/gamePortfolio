// Runs the real Go backend and the Expo web export from a throwaway copy, on a throwaway database.
// Local email and password auth only; no Cognito, no AWS. Every person and place here is made up,
// and "photos" are simple drawings served for a made-up domain, so nothing leaves the machine.
import { execFileSync } from "node:child_process";

const API = "http://127.0.0.1:4125/api/v1";
const PHOTO_HOST = "https://photos.whereto.example";
const psql = (sql) =>
  execFileSync("docker", ["exec", "-i", "portfolio-demo-pg", "psql", "-q", "-U", "postgres", "-d", "whereto_demo", "-v", "ON_ERROR_STOP=1", "-c", sql]);

const scene = (sky1, sky2, ground, sun, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#s)"/><circle cx="590" cy="190" r="70" fill="${sun}"/>
  <path d="M0 420 Q180 330 360 410 T800 380 V600 H0Z" fill="${ground}" opacity=".65"/>
  <path d="M0 500 Q240 430 460 500 T800 480 V600 H0Z" fill="${ground}"/>${extra}</svg>`;

const windows = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>` +
  [0, 1, 2].flatMap((r) => [0, 1].map((col) => `<rect x="${x + 14 + col * (w / 2 - 4)}" y="${y + 18 + r * (h / 3.4)}" width="${w / 2 - 28}" height="${h / 7}" fill="#FFE9A8"/>`)).join("");
const palm = (x, y) => `<rect x="${x}" y="${y}" width="10" height="110" fill="#5A3A28"/><circle cx="${x + 5}" cy="${y - 4}" r="44" fill="#2F7D5B"/>`;

const PHOTOS = {
  "harbour-dusk.svg": scene("#2B3A67", "#F7A072", "#16324F", "#FFD27D", `<path d="M250 500h300l-40 44H290z" fill="#F4F1DE"/><rect x="392" y="400" width="10" height="100" fill="#F4F1DE"/>`),
  "noodle-lane.svg": scene("#3D2C5A", "#C56E90", "#2C2233", "#FFC6A5", windows(120, 250, 180, 250, "#6E3B58") + windows(480, 210, 200, 290, "#4C3A6E")),
  "lookout-walk.svg": scene("#8FD3E8", "#E9F5DB", "#4F772D", "#FFF3B0", palm(150, 360) + palm(640, 390)),
  "kettle-crow.svg": scene("#F4D35E", "#FFF8E8", "#A4583A", "#EE964B", windows(290, 260, 220, 240, "#7A4B32")),
  "saltline.svg": scene("#5FA8D3", "#CAE9FF", "#E9C46A", "#FFFFFF", `<rect x="300" y="400" width="200" height="110" fill="#E76F51"/><path d="M280 400h240l-30-50H310z" fill="#F4F1DE"/>`),
  "market-morning.svg": scene("#FFCDB2", "#FFF1E6", "#6D9773", "#FFB4A2", windows(200, 280, 150, 220, "#B56576") + windows(450, 300, 150, 200, "#6D597A")),
};
const photo = (name) => `${PHOTO_HOST}/${name}`;

const lit = (s) => `'${s.replace(/'/g, "''")}'`;
const iso = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600000).toISOString();

function seedSql(demoId) {
  const people = [
    ["u-tess", "tess@example.com", "Tess Marlow", "tessgoesout", "Weekend wanderer."],
    ["u-jonah", "jonah@example.com", "Jonah Reed", "jonaheats", "Will queue for noodles."],
    ["u-ana", "ana@example.com", "Ana Beltran", "anaoutside", "Coastal walks and coffee."],
  ];
  const tags = ["coffee", "foodie", "date-night", "outdoors"];
  const posts = [
    { id: "tess1", who: "u-tess", title: "Slow Sunday by the water", city: "Sydney", desc: "An easy walk with snacks at both ends.", caption: "Best bit was the kiosk at the far end of the walk.", hours: 2, tags: ["outdoors", "coffee"], saves: 128, comments: ["Doing this next weekend.", "That kiosk is worth the walk."],
      steps: [["Kettle & Crow", "Flat whites to take with you", 30, "kettle-crow.svg"], ["Tidepool Walk", "Start at the north end, it's flatter", 60, "lookout-walk.svg"], ["Saltline Kiosk", "Fish sandwich, no question", 45, "saltline.svg"]] },
    { id: "jonah1", who: "u-jonah", title: "Cheap eats crawl, four stops", city: "Melbourne", desc: "Dinner in four small plates.", caption: "Forty dollars, four stops, no regrets.", hours: 9, tags: ["foodie"], saves: 342, comments: ["Lantern Lane is unreal."],
      steps: [["Lantern Lane Noodles", "Go before six to skip the queue", 40, "noodle-lane.svg"], ["Gully Dumplings", "Order the pan-fried ones", 30, null], ["Marigold Gelato", "Black sesame", 20, null], ["Night Market Corner", "Finish with skewers", 40, "market-morning.svg"]] },
    { id: "ana1", who: "u-ana", title: "Golden hour first date", city: "Brisbane", desc: "Walk, talk, then something to eat.", caption: "Low pressure and it always works.", hours: 26, tags: ["date-night", "outdoors"], saves: 97, comments: [],
      steps: [["Fernhill Lookout", "Arrive half an hour before sunset", 45, "harbour-dusk.svg"], ["The Copper Pear", "Share the mezze plate", 90, null]] },
  ];

  const rows = [];
  rows.push(`INSERT INTO users (id, email, password_hash, name, display_name, bio, created_at, updated_at) VALUES ${people
    .map(([id, email, name, handle, bio]) => `(${lit(id)}, ${lit(email)}, '-', ${lit(name)}, ${lit(handle)}, ${lit(bio)}, now(), now())`)
    .join(",")};`);
  rows.push(`INSERT INTO tags (id, name, slug) VALUES ${tags.map((t) => `(${lit(`t-${t}`)}, ${lit(t)}, ${lit(t)})`).join(",")};`);
  rows.push(`INSERT INTO follows (id, follower_id, followee_id, created_at) VALUES ('f1', ${lit(demoId)}, 'u-tess', now()), ('f2', ${lit(demoId)}, 'u-ana', now());`);
  for (const p of posts) {
    const total = p.steps.reduce((sum, s) => sum + s[2], 0);
    rows.push(`INSERT INTO plans (id, user_id, title, description, city, estimated_duration, created_at, updated_at) VALUES (${lit(`plan-${p.id}`)}, ${lit(p.who)}, ${lit(p.title)}, ${lit(p.desc)}, ${lit(p.city)}, ${total}, now(), now());`);
    p.steps.forEach(([place, notes, mins], i) => {
      rows.push(`INSERT INTO plan_steps (id, plan_id, place_id, place_name, notes, position, estimated_minutes, created_at) VALUES (${lit(`${p.id}-s${i}`)}, ${lit(`plan-${p.id}`)}, ${lit(place.toLowerCase().replace(/\W+/g, "-"))}, ${lit(place)}, ${lit(notes)}, ${i}, ${mins}, now());`);
    });
    p.tags.forEach((t) => rows.push(`INSERT INTO plan_tags (plan_id, tag_id) VALUES (${lit(`plan-${p.id}`)}, ${lit(`t-${t}`)});`));
    rows.push(`INSERT INTO posts (id, plan_id, user_id, caption, cover_image_url, saves_count, comments_count, published_at, created_at, updated_at) VALUES (${lit(`post-${p.id}`)}, ${lit(`plan-${p.id}`)}, ${lit(p.who)}, ${lit(p.caption)}, ${lit(photo(p.steps[0][3] ?? "harbour-dusk.svg"))}, ${p.saves}, ${p.comments.length}, ${lit(iso(p.hours))}, now(), now());`);
    p.steps.forEach((s, i) => {
      if (s[3]) rows.push(`INSERT INTO post_images (id, post_id, step_id, url, position, created_at) VALUES (${lit(`${p.id}-i${i}`)}, ${lit(`post-${p.id}`)}, ${lit(`${p.id}-s${i}`)}, ${lit(photo(s[3]))}, ${i}, now());`);
    });
    p.comments.forEach((c, i) => rows.push(`INSERT INTO comments (id, post_id, user_id, body, created_at) VALUES (${lit(`${p.id}-c${i}`)}, ${lit(`post-${p.id}`)}, ${lit(people[(i + 1) % 3][0])}, ${lit(c)}, now());`));
  }
  return rows.join("\n");
}

export default {
  title: "Whereto",
  tagline: "A social app for sharing plans of where to go, stop by stop.",
  url: "http://127.0.0.1:4126",
  addressBar: "whereto",
  viewport: { width: 390, height: 844 },
  mobile: true,
  async setup({ context }) {
    await context.route(`${PHOTO_HOST}/**`, (route) => {
      const name = new URL(route.request().url()).pathname.slice(1);
      route.fulfill({ status: 200, contentType: "image/svg+xml", body: PHOTOS[name] ?? PHOTOS["saltline.svg"] });
    });
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
    // A clean slate each take, then a real sign-up through the real API.
    psql("TRUNCATE users, tags CASCADE;");
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "demo@example.com", password: "local-demo-only", name: "Demo Explorer" }),
    });
    if (!res.ok) throw new Error(`register failed: ${res.status}`);
    const auth = await res.json();
    psql(seedSql(auth.user.id));
    await d.goto("/login");
    await d.page.evaluate((a) => {
      localStorage.setItem("whereto.accessToken", a.accessToken);
      localStorage.setItem("whereto.refreshToken", a.refreshToken);
      localStorage.setItem("whereto.user", JSON.stringify(a.user));
    }, auth);
    await d.goto("/");
    await d.waitFor(':text("Slow Sunday by the water")');
  },
  async run(d) {
    await d.goto("/");
    await d.waitFor(':text("Slow Sunday by the water")');
    await d.popup("Whereto's feed is made of plans for a day or night out, each with its stops in order.", { on: ':text("Slow Sunday by the water")' });
    // A horizontal scroll is what a swipe is on the phone. The carousel's chevrons move its dots but
    // not its slides in the web export, so they aren't used here.
    await d.hover(':text("Kettle & Crow")');
    await d.popup("Swiping through a post shows a photo or a note for each stop.");
    await d.page.mouse.wheel(390, 0);
    await d.wait(1300);
    await d.page.mouse.wheel(390, 0);
    await d.wait(1300);

    await d.clickThrough('[href="/create"], [href="/plans/create"]', 'input[placeholder="Give your plan a name"]');
    await d.type('input[placeholder="Give your plan a name"]', "Rainy day in the city");
    // The first two stops are filled in off camera, so the film only watches the last one being typed.
    await d.cut(async () => {
      const p = d.page;
      await p.locator('input[placeholder="Search city..."]').fill("Sydney");
      await p.locator(':text("+ Add a stop")').first().click();
      await p.locator('input[placeholder="Search place..."]').nth(0).fill("Paper Moon Books");
      await p.locator('input[placeholder="Notes (optional)"]').nth(0).fill("Start upstairs");
      await p.locator(':text("+ Add a stop")').first().click();
      await p.locator('input[placeholder="Search place..."]').nth(1).fill("Ember Ramen");
      await p.locator('input[placeholder="Notes (optional)"]').nth(1).fill("Share the gyoza");
      await d.wait(300);
    });
    await d.click(':text("+ Add a stop")', { after: 300, popup: "A plan is an ordered list of stops, each with its own notes, and the total time adds up as you go." });
    await d.type('input[placeholder="Search place..."] >> nth=2', "The Arcade Cinema");
    await d.clickThrough(':text-is("Create Plan") >> nth=-1', ':text("Slow Sunday by the water")');

    await d.clickThrough('[href="/plans"]', ':text("Rainy day in the city")');
    await d.clickThrough(':text("Rainy day in the city")', ':text-is("Flow")');
    await d.popup("The plan page shows the whole flow, and from here you can start it, edit it or post about it.", { on: ':text-is("Flow")' });

    await d.clickThrough(':text-is("Make Post")', 'textarea[placeholder^="Tell the story"]');
    await d.popup("Posting is a short wizard that adds a caption and photos, and the plan stays separate from the post.");
    await d.type('textarea[placeholder^="Tell the story"]', "Three stops, all indoors, nobody got wet.");
    await d.click(':text-is("Next")', { after: 500 });
    await d.cut(async () => {
      await d.page.locator('input[placeholder^="https://"]').first().fill(photo("noodle-lane.svg"));
      await d.wait(700);
    });
    await d.click(':text-is("Next")', { after: 500, popup: "Each stop can have its own photo, which slots into the post's carousel in the right order." });
    await d.cut(async () => {
      await d.page.locator(':text-is("Next")').first().click();
      await d.wait(400);
      await d.page.locator(':text-is("Next")').first().click();
      await d.wait(500);
    });
    await d.clickThrough(':text-is("Create post")', 'input[placeholder="Add a comment..."]');

    await d.type('input[placeholder="Add a comment..."]', "Go for the late session.");
    await d.click(':text-is("Post") >> nth=-1', { after: 900, popup: "Posts have comments and a save button, and anything you save lands in your Favourites." });

    await d.goto("/");
    await d.waitFor(':text("Rainy day in the city")');
    await d.popup("The new post now sits at the top of the For You feed, newest first.", { on: ':text("Rainy day in the city")' });
    await d.click(':text-is("Following")', { after: 1200, popup: "The Following tab narrows the feed to the people you follow." });
  },
};
