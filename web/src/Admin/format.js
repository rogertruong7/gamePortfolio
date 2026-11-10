export const RANGES = [
  { days: "1", label: "24 hours", phrase: "in the last 24 hours" },
  { days: "7", label: "7 days", phrase: "in the last 7 days" },
  { days: "30", label: "30 days", phrase: "in the last 30 days" },
  { days: "90", label: "90 days", phrase: "in the last 90 days" },
  { days: "all", label: "All time", phrase: "so far" },
];

export const plural = (count, one, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

export function formatDuration(ms) {
  const seconds = Math.round((ms ?? 0) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

// Days arrive as YYYY-MM-DD. Parsed at midday so no time zone can shift the date.
export const formatDay = (day) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function describeEvent({ type, name, path }) {
  switch (type) {
    case "page_view":
      return path === "/" ? "Arrived in town" : `Opened ${path}`;
    case "game_loaded":
      return "Town finished loading";
    case "first_move":
      return "Started walking around";
    case "scene_enter":
      return `Walked into ${name}`;
    case "open_item":
      return `Opened ${name}`;
    case "cv_download":
      return "Downloaded your CV";
    case "outbound_click":
      return `Clicked ${name}`;
    default:
      return type;
  }
}

export const describePlace = (session) =>
  [session.city, session.region, session.country].filter(Boolean).join(", ") ||
  "Unknown location";

export function describeDevice(session) {
  const device = [session.browser, session.os].filter(Boolean).join(" on ");
  return device || "Unknown device";
}
