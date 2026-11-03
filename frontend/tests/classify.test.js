import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySource, isBot, parseUserAgent } from "../api/_lib/classify.js";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const source = (referrer, ref = null) =>
  classifySource({ ref, referrer, ownHost: "roger-was-here.com" });

test("LinkedIn is recognised however the visit arrives", () => {
  assert.equal(source("https://www.linkedin.com/feed/"), "LinkedIn");
  assert.equal(source("https://lnkd.in/abc"), "LinkedIn");
  assert.equal(source("android-app://com.linkedin.android/"), "LinkedIn");
  assert.equal(source(null, "linkedin"), "LinkedIn");
});

test("a tagged link beats the referrer", () => {
  assert.equal(source("https://www.google.com/", "atlassian"), "atlassian");
});

test("no referrer, or the site's own referrer, counts as direct", () => {
  assert.equal(source(null), "Direct");
  assert.equal(source("https://roger-was-here.com/projects/whereto"), "Direct");
  assert.equal(source("not a url"), "Direct");
});

test("known sites get a friendly name and others show their host", () => {
  assert.equal(source("https://www.google.com.au/"), "Google");
  assert.equal(source("https://mail.google.com/"), "Email");
  assert.equal(source("https://t.co/xyz"), "X");
  assert.equal(source("https://github.com/rogertruong7"), "GitHub");
  assert.equal(source("https://www.example.org/post"), "example.org");
});

test("look-alike hosts are not mistaken for known sites", () => {
  assert.equal(source("https://notgithub.com/"), "notgithub.com");
});

test("user agents are parsed into readable parts", () => {
  const mac = parseUserAgent(CHROME_MAC);
  assert.equal(mac.browser, "Chrome 130");
  assert.equal(mac.os, "macOS");
  assert.equal(mac.deviceType, "desktop");

  const windows = parseUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
  );
  assert.equal(windows.os, "Windows 10 or 11");

  const phone = parseUserAgent(IPHONE);
  assert.equal(phone.browser, "Safari 17");
  assert.equal(phone.deviceType, "mobile");
});

test("a missing user agent does not throw", () => {
  assert.equal(parseUserAgent(null).browser, null);
});

test("bots are flagged and real browsers are not", () => {
  assert.equal(isBot(CHROME_MAC), false);
  assert.equal(isBot(IPHONE), false);
  assert.equal(isBot("LinkedInBot/1.0 (compatible; Mozilla/5.0)"), true);
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBot(null), true);
  assert.equal(isBot(CHROME_MAC, true), true);
});
