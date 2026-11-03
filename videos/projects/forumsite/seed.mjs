// Writes a made-up database.json for the real QandA backend, shaped exactly as service.js saves it.
// Usage: node seed.mjs <path to backend/database.json>
import fs from "node:fs";

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const U = { priya: 50101, tomas: 50102, hana: 50103, owen: 50104 };
const user = (email, name, admin = false) => ({ email, name, password: "demo-pass", image: null, admin, threadsWatching: [] });
const users = {
  [U.priya]: user("priya@example.com", "Priya Nair"),
  [U.tomas]: user("tomas@example.com", "Tomas Reid"),
  [U.hana]: user("hana@example.com", "Hana Cole", true),
  [U.owen]: user("owen@example.com", "Owen Blake"),
};

const likes = (...who) => Object.fromEntries(who.map((u) => [u, true]));
const threads = {};
let tid = 700000;
const thread = (creatorId, mins, title, content, liked = []) => {
  const id = ++tid;
  threads[id] = { id, creatorId, title, isPublic: true, content, lock: false, createdAt: ago(mins), likes: likes(...liked), watchees: {} };
  return id;
};

thread(U.owen, 60 * 24 * 9, "Binary search off by one", "My loop never ends when the target is missing. Should the upper bound be length or length minus one?", [U.priya]);
thread(U.hana, 60 * 24 * 7, "Tabs or spaces in the repo", "We are setting up a shared linter config for the team. Does anyone have a strong reason to pick one?", [U.tomas, U.owen]);
thread(U.tomas, 60 * 24 * 6, "Is localStorage safe for tokens", "The app keeps its login token in localStorage. What are the real risks here, and what would you do instead?", [U.hana]);
thread(U.owen, 60 * 24 * 4, "CSS for a single page app", "One stylesheet per screen is getting messy. How do you stop rules on one screen leaking into another?", [U.priya, U.hana]);
thread(U.hana, 60 * 24 * 3, "Promise.all or a for loop", "I need to fetch a list of users. Is it better to run the requests together or one at a time?", [U.priya, U.tomas, U.owen]);
thread(U.priya, 60 * 26, "Why does my fetch run twice", "I attach the click listener inside the function that draws the screen, and now each click sends one more request than the last. What am I missing?");
const main = thread(U.tomas, 60 * 5, "How to debounce a search box", "Every keystroke in my search box sends a request to the server. What is the simplest way to wait until the person stops typing, without pulling in a library?", [U.hana, U.owen]);

const comments = {};
let cid = 800000;
const comment = (threadId, creatorId, parentCommentId, mins, content, liked = []) => {
  const id = ++cid;
  comments[id] = { id, creatorId, threadId, parentCommentId, content, createdAt: ago(mins), likes: likes(...liked) };
  return id;
};

const first = comment(main, U.hana, null, 60 * 4, "Keep one timer outside the handler. Clear it on each keystroke, then start it again for 300 ms.", [U.tomas, U.owen]);
comment(main, U.owen, first, 60 * 3, "This is the one. Remember to skip the request when the box is empty, too.", [U.hana]);
comment(main, U.owen, null, 60 * 2, "If you also cancel the old request with an AbortController, slow answers can't overwrite newer ones.");

fs.writeFileSync(process.argv[2], JSON.stringify({ users, threads, comments }, null, 2));
console.log(`seeded ${Object.keys(threads).length} threads, ${Object.keys(comments).length} comments`);
