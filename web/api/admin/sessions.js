import { isAuthenticated } from "../_lib/auth.js";
import { getSql } from "../_lib/db.js";
import { json } from "../_lib/http.js";
import { parseDays } from "../_lib/range.js";

const PAGE_SIZE = 30;

function parseBefore(url) {
  const value = new URL(url).searchParams.get("before");
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request) {
  if (!isAuthenticated(request)) return json(401, { error: "Not logged in" });

  const sql = getSql();
  if (!sql) return json(503, { error: "Analytics is not configured" });

  try {
    const sessions = await sql.query(
      `SELECT s.*,
              (SELECT count(*)::int FROM sessions earlier
               WHERE earlier.visitor_id = s.visitor_id
                 AND earlier.started_at <= s.started_at) AS visit_number,
              coalesce((
                SELECT json_agg(event ORDER BY event.occurred_at, event.id)
                FROM (
                  SELECT e.id, e.type, e.name, e.path, e.meta, e.occurred_at
                  FROM events e
                  WHERE e.session_id = s.id
                  ORDER BY e.occurred_at, e.id
                  LIMIT 200
                ) event
              ), '[]') AS events
       FROM sessions s
       WHERE NOT s.is_bot
         AND ($1::int IS NULL OR s.started_at > now() - ($1::int * interval '1 day'))
         AND ($2::timestamptz IS NULL OR s.started_at < $2::timestamptz)
       ORDER BY s.started_at DESC
       LIMIT $3`,
      [parseDays(request.url), parseBefore(request.url), PAGE_SIZE + 1]
    );
    const hasMore = sessions.length > PAGE_SIZE;
    return json(200, { sessions: sessions.slice(0, PAGE_SIZE), hasMore });
  } catch (error) {
    console.error("Failed to load sessions:", error.message);
    return json(500, { error: "Failed to load sessions" });
  }
}
