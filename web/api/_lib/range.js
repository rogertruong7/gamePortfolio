const ALLOWED_DAYS = new Set([1, 7, 30, 90, 365]);

// Returns a whole number of days from the allowlist, or null for all time.
export function parseDays(url) {
  const value = new URL(url).searchParams.get("days");
  if (value === "all") return null;
  const days = Number(value);
  return ALLOWED_DAYS.has(days) ? days : 30;
}
