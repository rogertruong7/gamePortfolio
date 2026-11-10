// This endpoint is public, so everything from the browser is treated as hostile.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// RegExp.test coerces its argument, so ["<uuid>"] would pass without the type check.
const isUuid = (value) => typeof value === "string" && UUID.test(value);

export const EVENT_TYPES = new Set([
  "page_view",
  "game_loaded",
  "first_move",
  "scene_enter",
  "open_item",
  "cv_download",
  "outbound_click",
]);

export const MAX_BODY_BYTES = 64_000;
const MAX_EVENTS = 50;
const MAX_EVENT_AGE_MS = 60 * 60 * 1000;
const MAX_ACTIVE_DELTA_MS = 6 * 60 * 60 * 1000;
const MAX_META_BYTES = 1000;

const CLIENT_FIELDS = {
  screenWidth: "number",
  screenHeight: "number",
  viewportWidth: "number",
  viewportHeight: "number",
  pixelRatio: "number",
  language: "string",
  languages: "strings",
  timezone: "string",
  connection: "string",
  deviceMemory: "number",
  cpuCores: "number",
  touchPoints: "number",
  colorScheme: "string",
  webdriver: "boolean",
};

const UTM_FIELDS = ["source", "medium", "campaign", "term", "content"];

const text = (value, max) =>
  typeof value === "string" && value ? value.slice(0, max) : null;

const clamp = (value, min, max) =>
  Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;

function sanitizeClient(client) {
  const clean = {};
  if (!client || typeof client !== "object") return clean;
  for (const [field, kind] of Object.entries(CLIENT_FIELDS)) {
    const value = client[field];
    if (kind === "number" && Number.isFinite(value)) clean[field] = value;
    if (kind === "boolean" && value === true) clean[field] = true;
    if (kind === "string" && typeof value === "string") {
      clean[field] = value.slice(0, 100);
    }
    if (kind === "strings" && Array.isArray(value)) {
      clean[field] = value
        .filter((item) => typeof item === "string")
        .slice(0, 10)
        .map((item) => item.slice(0, 20));
    }
  }
  return clean;
}

function sanitizeUtm(utm) {
  const clean = {};
  if (!utm || typeof utm !== "object") return clean;
  for (const field of UTM_FIELDS) {
    const value = text(utm[field], 200);
    if (value) clean[field] = value;
  }
  return clean;
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const encoded = JSON.stringify(meta);
  return encoded.length <= MAX_META_BYTES ? meta : null;
}

function sanitizeEvent(event) {
  if (!event || !EVENT_TYPES.has(event.type)) return null;
  return {
    type: event.type,
    name: text(event.name, 300),
    path: text(event.path, 300),
    meta: sanitizeMeta(event.meta),
    ageMs: clamp(event.ageMs, 0, MAX_EVENT_AGE_MS),
  };
}

// Returns a clean payload, or null if it is not one the tracker could have sent.
export function sanitizePayload(input) {
  if (!input || typeof input !== "object") return null;
  if (!isUuid(input.visitorId) || !isUuid(input.sessionId)) return null;
  if (!Array.isArray(input.events)) return null;

  const context = input.context ?? {};
  return {
    visitorId: input.visitorId.toLowerCase(),
    sessionId: input.sessionId.toLowerCase(),
    activeMs: Math.round(clamp(input.activeMs, 0, MAX_ACTIVE_DELTA_MS)),
    events: input.events
      .slice(0, MAX_EVENTS)
      .map(sanitizeEvent)
      .filter(Boolean),
    context: {
      landingPath: text(context.landingPath, 300),
      referrer: text(context.referrer, 2000),
      ref: text(context.ref, 100),
      utm: sanitizeUtm(context.utm),
      client: sanitizeClient(context.client),
    },
  };
}
