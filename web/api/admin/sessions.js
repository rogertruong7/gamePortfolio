import { isAuthenticated } from "../_lib/auth.js";
import { getSql } from "../_lib/db.js";
import { ensureExclusionsTable, NOT_EXCLUDED } from "../_lib/exclusions.js";
import { json } from "../_lib/http.js";
import { parseDays } from "../_lib/range.js";
import { nearestSuburb } from "../_lib/suburbs.js";

const PAGE_SIZE = 30;
const MAX_OFFSET = 10000;
const MAX_SEARCH_LENGTH = 100;

// What each sortable column orders by. Keys come from the client, so only
// these expressions ever reach the SQL.
export const SORTS = {
  when: "started_at",
  network: "lower(org)",
  place: "lower(nullif(concat_ws(', ', city, region, country), ''))",
  source: "lower(source)",
  device: "lower(nullif(concat_ws(' ', browser, os), ''))",
  visit: "visit_number",
  stay: "active_ms",
  places: "places_count",
  cv: "took_cv",
};

export function parseListOptions(url) {
  const params = new URL(url).searchParams;
  const sort = Object.hasOwn(SORTS, params.get("sort")) ? params.get("sort") : "when";
  const dir = params.get("dir") === "asc" ? "ASC" : "DESC";
  const offset = Math.min(
    MAX_OFFSET,
    Math.max(0, Number.parseInt(params.get("offset"), 10) || 0)
  );
  const query = (params.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  // Escape LIKE wildcards so a search for "50%" means the text "50%".
  const search = query ? `%${query.replace(/[\\%_]/g, "\\$&")}%` : null;
  return { sort, dir, offset, search, cvOnly: params.get("cv") === "1" };
}

export async function GET(request) {
  if (!isAuthenticated(request)) return json(401, { error: "Not logged in" });

  const sql = getSql();
  if (!sql) return json(503, { error: "Analytics is not configured" });

  const { sort, dir, offset, search, cvOnly } = parseListOptions(request.url);
  const order = `${SORTS[sort]} ${dir} NULLS LAST, started_at DESC, id`;

  try {
    await ensureExclusionsTable(sql);
    const rows = await sql.query(
      `WITH guests AS (
         SELECT s.*,
                (SELECT count(*)::int FROM sessions earlier
                 WHERE earlier.visitor_id = s.visitor_id
                   AND earlier.started_at <= s.started_at) AS visit_number,
                (SELECT count(*)::int FROM events e
                 WHERE e.session_id = s.id
                   AND e.type IN ('scene_enter', 'open_item')) AS places_count,
                EXISTS (SELECT 1 FROM events e
                        WHERE e.session_id = s.id AND e.type = 'cv_download') AS took_cv
         FROM sessions s
         WHERE NOT s.is_bot
           AND ($1::int IS NULL OR s.started_at > now() - ($1::int * interval '1 day'))
           AND ${NOT_EXCLUDED}
           AND ($2::text IS NULL OR concat_ws(' ',
                 s.org, s.isp, s.org_domain, s.city, s.region, s.country, s.ip,
                 s.source, s.ref, s.browser, s.os, s.device_type, s.device_model,
                 s.visitor_id::text) ILIKE $2)
       ),
       page AS (
         SELECT *, count(*) OVER ()::int AS total
         FROM guests
         WHERE $3::boolean IS NOT TRUE OR took_cv
         ORDER BY ${order}
         LIMIT $4 OFFSET $5
       )
       SELECT page.*,
              coalesce((
                SELECT json_agg(event ORDER BY event.occurred_at, event.id)
                FROM (
                  SELECT e.id, e.type, e.name, e.path, e.meta, e.occurred_at
                  FROM events e
                  WHERE e.session_id = page.id
                  ORDER BY e.occurred_at, e.id
                  LIMIT 200
                ) event
              ), '[]') AS events
       FROM page
       ORDER BY ${order}`,
      [parseDays(request.url), search, cvOnly, PAGE_SIZE, offset]
    );
    const total = rows[0]?.total ?? 0;
    return json(200, {
      sessions: rows.map((row) => ({ ...row, suburb: nearestSuburb(row) })),
      total,
      hasMore: offset + rows.length < total,
    });
  } catch (error) {
    console.error("Failed to load sessions:", error.message);
    return json(500, { error: "Failed to load sessions" });
  }
}
