// Real frontend and real Express backend from a throwaway copy, seeded with seed.mjs. Nothing is mocked.
export default {
  title: "QandA Forum",
  tagline: "A question and answer forum built with plain JavaScript on a single HTML page.",
  url: "http://127.0.0.1:4132",
  addressBar: "qanda forum",
  viewport: { width: 1440, height: 810 },
  async run(d) {
    await d.goto("/");
    await d.waitFor("#sign_in_button");
    await d.popup("The whole forum is one HTML page, with screens swapped in plain JavaScript and no framework or router.");
    await d.type("#sign_in_email", "priya@example.com", { delay: 30 });
    await d.type("#sign_in_password", "demo-pass", { delay: 30 });
    await d.clickThrough("#sign_in_button", "#threads_sidebar li");
    await d.popup("The sidebar loads threads from the API five at a time, newest first.", { on: "#threads_sidebar" });
    await d.clickThrough('#threads_sidebar li:has-text("How to debounce")', "#comments_list .comment:not(#comment0)");
    await d.click("#like_button", { popup: "Likes go to the server straight away, and the heart follows what it sends back.", after: 800 });
    await d.click('.comment:has-text("Keep one timer") .reply_text', { popup: "Comments can be replied to at any depth, each level indented under its parent.", after: 500 });
    await d.type('.comment:has-text("Keep one timer") > .reply_content_container .reply_content', "Thanks, a shared timer fixed mine.", { delay: 28 });
    await d.clickThrough('.comment:has-text("Keep one timer") > .reply_content_container .reply_submit_button', '.comment_text:has-text("a shared timer fixed mine")');
    await d.scroll(260, 500);
    await d.wait(900);
    await d.clickThrough("#create_icon", "#create_thread_title");
    await d.type("#create_thread_title", "Reading a file in chunks", { delay: 28 });
    await d.type("#create_thread_content", "What is the cleanest way to read a large file without loading it all into memory?", { delay: 18 });
    await d.clickThrough("#create_thread_submit", '#threads_sidebar li.selected:has-text("Reading a file")');
    await d.popup("A new thread goes straight to the top of the sidebar without a page reload.", { on: "#threads_sidebar li.selected" });
    await d.wait(600);
  },
};
