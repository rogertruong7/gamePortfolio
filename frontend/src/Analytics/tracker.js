// First-party visit tracking for the /admin page. Nothing here may ever break
// the game, so anything that can throw is contained and failures are dropped.

const ENDPOINT = "/api/game-events";
const VISITOR_KEY = "gp_visitor";
const SESSION_KEY = "gp_session";
const OWNER_KEY = "gp_owner";

const SESSION_IDLE_MS = 30 * 60 * 1000;
const ACTIVE_INPUT_WINDOW_MS = 2 * 60 * 1000;
const TICK_MS = 5 * 1000;
const FLUSH_DELAY_MS = 2 * 1000;
const HEARTBEAT_MS = 60 * 1000;
const MIN_ACTIVE_ONLY_FLUSH_MS = 1000;

const TAG_PARAMS = [
  "ref",
  "li_fat_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

const memoryStore = new Map();

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((group) => group.join(""))
    .join("-");
}

const isAdminPath = () => window.location.pathname.startsWith("/admin");
const isExcluded = () => readStore(OWNER_KEY) === "true" || isAdminPath();

function visitorId() {
  let id = readStore(VISITOR_KEY);
  if (!id) {
    id = makeId();
    writeStore(VISITOR_KEY, id);
  }
  return id;
}

function loadSession() {
  try {
    return JSON.parse(readStore(SESSION_KEY));
  } catch {
    return null;
  }
}

const saveSession = (session) =>
  writeStore(SESSION_KEY, JSON.stringify(session));

function readClientDetails() {
  const { screen, navigator: nav } = window;
  return {
    screenWidth: screen?.width,
    screenHeight: screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    language: nav.language,
    languages: nav.languages ? [...nav.languages] : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
    cpuCores: nav.hardwareConcurrency,
    touchPoints: nav.maxTouchPoints,
    colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    webdriver: nav.webdriver === true,
  };
}

let queue = [];
let flushTimer = null;
let pendingActiveMs = 0;
let lastTickAt = 0;
let lastInputAt = 0;
let lastFlushAt = 0;
let lastPagePath = null;
let pendingTags = null;

// Reads the tag from the URL once, then removes it so that a forwarded link
// does not get credited to whoever it was originally sent to.
function captureTags() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (!TAG_PARAMS.some((param) => params.has(param))) return;

  pendingTags = {
    ref:
      params.get("ref") ||
      params.get("utm_source") ||
      (params.has("li_fat_id") ? "linkedin" : null),
    utm: {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      term: params.get("utm_term"),
      content: params.get("utm_content"),
    },
  };
  TAG_PARAMS.forEach((param) => params.delete(param));
  window.history.replaceState(window.history.state, "", url);
}

function startSession() {
  const session = {
    id: makeId(),
    lastSeen: Date.now(),
    context: {
      landingPath: window.location.pathname,
      referrer: document.referrer || null,
      ref: pendingTags?.ref ?? null,
      utm: pendingTags?.utm ?? {},
      client: readClientDetails(),
    },
  };
  pendingTags = null;
  saveSession(session);
  lastPagePath = window.location.pathname;
  enqueue("page_view", null, null, session.lastSeen);
  return session;
}

function currentSession() {
  const session = loadSession();
  const isTaggedAgain =
    pendingTags?.ref && pendingTags.ref !== session?.context?.ref;
  if (
    session?.id &&
    !isTaggedAgain &&
    Date.now() - session.lastSeen < SESSION_IDLE_MS
  ) {
    return session;
  }
  if (session?.id) flush();
  return startSession();
}

function touchSession() {
  const session = currentSession();
  session.lastSeen = Date.now();
  saveSession(session);
}

function enqueue(type, name, meta, at = Date.now()) {
  queue.push({ type, name, meta, path: window.location.pathname, at });
}

function send(body) {
  const blob = new Blob([body], { type: "application/json" });
  if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
  fetch(ENDPOINT, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch(() => {});
}

function flush() {
  clearTimeout(flushTimer);
  flushTimer = null;

  const session = loadSession();
  if (!session?.id || isExcluded()) {
    queue = [];
    return;
  }
  if (queue.length === 0 && pendingActiveMs < MIN_ACTIVE_ONLY_FLUSH_MS) return;

  const now = Date.now();
  const body = JSON.stringify({
    visitorId: visitorId(),
    sessionId: session.id,
    activeMs: pendingActiveMs,
    context: session.context,
    events: queue.map(({ at, ...event }) => ({ ...event, ageMs: now - at })),
  });
  queue = [];
  pendingActiveMs = 0;
  lastFlushAt = now;
  send(body);
}

function countActiveTime() {
  const now = Date.now();
  const elapsed = now - lastTickAt;
  lastTickAt = now;
  const isActive =
    document.visibilityState === "visible" &&
    now - lastInputAt < ACTIVE_INPUT_WINDOW_MS;
  if (!isActive) return;
  pendingActiveMs += Math.min(elapsed, TICK_MS * 2);
  touchSession();
}

function onTick() {
  try {
    countActiveTime();
    if (Date.now() - lastFlushAt >= HEARTBEAT_MS) flush();
  } catch {
    // Tracking must never surface an error to the visitor.
  }
}

function onPageHidden() {
  try {
    countActiveTime();
    flush();
  } catch {
    // As above.
  }
}

function onLinkClick(event) {
  const link = event.target.closest?.("a[href]");
  if (!link) return;
  if (link.hasAttribute("download")) {
    track("cv_download", link.getAttribute("download"));
    flush();
  } else if (link.host !== window.location.host) {
    track("outbound_click", link.href);
    flush();
  }
}

export function track(type, name = null, meta = null) {
  try {
    if (isExcluded()) return;
    touchSession();
    enqueue(type, name, meta);
    flushTimer ??= setTimeout(flush, FLUSH_DELAY_MS);
  } catch {
    // As above.
  }
}

export function trackPageView(path) {
  try {
    if (isExcluded()) return;
    touchSession();
    if (path === lastPagePath) return;
    lastPagePath = path;
    track("page_view");
  } catch {
    // As above.
  }
}

// Called once before React renders, so the router never sees the tag in the URL.
export function startTracking() {
  try {
    if (isExcluded()) return;
    captureTags();

    const now = Date.now();
    lastTickAt = now;
    lastInputAt = now;
    lastFlushAt = now;

    const noteInput = () => {
      lastInputAt = Date.now();
    };
    for (const type of ["pointermove", "pointerdown", "keydown", "scroll"]) {
      window.addEventListener(type, noteInput, { passive: true, capture: true });
    }
    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("auxclick", onLinkClick, true);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        onPageHidden();
      } else {
        lastTickAt = Date.now();
        lastInputAt = Date.now();
      }
    });
    window.addEventListener("pagehide", onPageHidden);
    setInterval(onTick, TICK_MS);
  } catch {
    // As above.
  }
}

// Stops this browser being counted, so checking your own site doesn't skew it.
export function excludeThisBrowser() {
  writeStore(OWNER_KEY, "true");
}
