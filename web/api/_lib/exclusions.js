// Guests hidden from /admin, by IP address or by visitor ID. Hiding is applied
// when reading, so un-hiding brings their past visits back.

export const EXCLUSION_KINDS = new Set(["ip", "visitor"]);
const MAX_LABEL_LENGTH = 80;
const IP_PATTERN = /^[0-9a-f.:]{2,45}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS excluded_guests (
    kind        text NOT NULL CHECK (kind IN ('ip', 'visitor')),
    value       text NOT NULL,
    label       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, value)
  )`;

let tableReady = null;

// The table is created on first use, so deploying needs no manual migration.
export function ensureExclusionsTable(sql) {
  tableReady ??= sql.query(CREATE_TABLE).catch((error) => {
    tableReady = null;
    throw error;
  });
  return tableReady;
}

// A WHERE condition for queries that alias sessions as `s`.
export const NOT_EXCLUDED = `NOT EXISTS (
    SELECT 1 FROM excluded_guests x
    WHERE (x.kind = 'ip' AND x.value = s.ip)
       OR (x.kind = 'visitor' AND x.value = s.visitor_id::text))`;

// Returns { kind, value, label } with a cleaned value, or null when invalid.
export function parseExclusion(body) {
  if (!body || typeof body !== "object") return null;
  const { kind } = body;
  const value = typeof body.value === "string" ? body.value.trim().toLowerCase() : "";
  if (!EXCLUSION_KINDS.has(kind)) return null;
  if (kind === "ip" && !IP_PATTERN.test(value)) return null;
  if (kind === "visitor" && !UUID_PATTERN.test(value)) return null;
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, MAX_LABEL_LENGTH)
      : null;
  return { kind, value, label };
}
