import Bowser from "bowser";

// The first match wins, so the more specific hosts come first.
const KNOWN_SOURCES = [
  [/linkedin|^lnkd\.in$/, "LinkedIn"],
  [/^mail\.google\.|outlook\.|^mail\.yahoo\./, "Email"],
  [/(^|\.)google\.|googlequicksearchbox/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)(x|twitter)\.com$|^t\.co$/, "X"],
  [/(^|\.)facebook\.com$|^fb\.me$|^l\.facebook\.com$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/(^|\.)seek\.com(\.au)?$/, "Seek"],
  [/(^|\.)indeed\./, "Indeed"],
  [/(^|\.)slack\.com$/, "Slack"],
  [/(^|\.)discord(app)?\.com$/, "Discord"],
];

const TAG_NAMES = new Map(
  ["LinkedIn", "GitHub", "Google", "Email", "Seek", "Indeed", "X"].map(
    (name) => [name.toLowerCase(), name]
  )
);

// A tagged link beats the referrer, because the tag says exactly what was sent
// and LinkedIn's apps usually strip their referrer.
export function classifySource({ ref, referrer, ownHost }) {
  if (ref) return TAG_NAMES.get(ref.toLowerCase()) ?? ref;
  if (!referrer) return "Direct";

  let host;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  if (!host) return "Direct";
  if (ownHost && host === ownHost.replace(/^www\./, "").split(":")[0]) {
    return "Direct";
  }

  const known = KNOWN_SOURCES.find(([pattern]) => pattern.test(host));
  return known ? known[1] : host;
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|preview|monitor|curl|wget|python-requests/i;

const join = (...parts) => parts.filter(Boolean).join(" ") || null;

// Browsers now freeze these version strings, so every modern Mac claims to be
// Catalina and Windows 11 claims to be Windows 10. Naming them would be wrong.
function describeOs(os) {
  if (os.name === "macOS" && os.version === "10.15.7") return "macOS";
  if (os.name === "Windows" && os.versionName === "10") return "Windows 10 or 11";
  return join(os.name, os.versionName ?? os.version);
}

export function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { browser: null, os: null, deviceType: null, deviceModel: null };
  }
  const { browser, os, platform } = Bowser.parse(userAgent);
  return {
    browser: join(browser.name, browser.version?.split(".")[0]),
    os: describeOs(os),
    deviceType: platform.type ?? null,
    deviceModel: join(platform.vendor, platform.model),
  };
}

export function isBot(userAgent, reportedWebdriver = false) {
  if (reportedWebdriver || !userAgent) return true;
  return (
    BOT_PATTERN.test(userAgent) || Bowser.parse(userAgent).platform.type === "bot"
  );
}
