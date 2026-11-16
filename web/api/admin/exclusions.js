import { isAuthenticated } from "../_lib/auth.js";
import { getSql } from "../_lib/db.js";
import { ensureExclusionsTable, parseExclusion } from "../_lib/exclusions.js";
import { clientIp, isSameOrigin, json } from "../_lib/http.js";

async function prepare(request, { writes = false } = {}) {
  if (writes && !isSameOrigin(request)) return { failure: json(403, { error: "Forbidden" }) };
  if (!isAuthenticated(request)) return { failure: json(401, { error: "Not logged in" }) };
  const sql = getSql();
  if (!sql) return { failure: json(503, { error: "Analytics is not configured" }) };
  await ensureExclusionsTable(sql);
  return { sql };
}

async function readExclusion(request) {
  try {
    return parseExclusion(await request.json());
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const { sql, failure } = await prepare(request);
    if (failure) return failure;
    const exclusions = await sql.query(
      `SELECT x.kind, x.value, x.label, x.created_at,
              (SELECT count(*)::int FROM sessions s
               WHERE (x.kind = 'ip' AND s.ip = x.value)
                  OR (x.kind = 'visitor' AND s.visitor_id::text = x.value)) AS sessions
       FROM excluded_guests x
       ORDER BY x.created_at DESC`
    );
    return json(200, { exclusions, yourIp: clientIp(request) });
  } catch (error) {
    console.error("Failed to load exclusions:", error.message);
    return json(500, { error: "Failed to load hidden guests" });
  }
}

export async function POST(request) {
  try {
    const { sql, failure } = await prepare(request, { writes: true });
    if (failure) return failure;
    const exclusion = await readExclusion(request);
    if (!exclusion) return json(400, { error: "That isn't a valid IP address or guest ID." });
    await sql.query(
      `INSERT INTO excluded_guests (kind, value, label) VALUES ($1, $2, $3)
       ON CONFLICT (kind, value) DO UPDATE SET label = coalesce(EXCLUDED.label, excluded_guests.label)`,
      [exclusion.kind, exclusion.value, exclusion.label]
    );
    return json(200, { ok: true });
  } catch (error) {
    console.error("Failed to add exclusion:", error.message);
    return json(500, { error: "Failed to hide that guest" });
  }
}

export async function DELETE(request) {
  try {
    const { sql, failure } = await prepare(request, { writes: true });
    if (failure) return failure;
    const exclusion = await readExclusion(request);
    if (!exclusion) return json(400, { error: "Invalid request" });
    await sql.query(`DELETE FROM excluded_guests WHERE kind = $1 AND value = $2`, [
      exclusion.kind,
      exclusion.value,
    ]);
    return json(200, { ok: true });
  } catch (error) {
    console.error("Failed to remove exclusion:", error.message);
    return json(500, { error: "Failed to un-hide that guest" });
  }
}
