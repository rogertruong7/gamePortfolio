import { isAuthenticated } from "../_lib/auth.js";
import { getSql } from "../_lib/db.js";
import { json } from "../_lib/http.js";
import { parseDays } from "../_lib/range.js";

const DAY_ZONE = "Australia/Sydney";

// Every query filters on these. $1 is the number of days, or null for all time.
const IN_RANGE = `
  NOT s.is_bot
  AND ($1::int IS NULL OR s.started_at > now() - ($1::int * interval '1 day'))`;

const breakdown = (expression, extraWhere = "") => `
  SELECT ${expression} AS label,
         count(*)::int AS sessions,
         count(DISTINCT s.visitor_id)::int AS visitors,
         count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM events e
           WHERE e.session_id = s.id AND e.type = 'cv_download'
         ))::int AS cv_sessions
  FROM sessions s
  WHERE ${IN_RANGE} AND ${expression} IS NOT NULL ${extraWhere}
  GROUP BY 1
  ORDER BY sessions DESC, label
  LIMIT 12`;

const QUERIES = {
  totals: `
    SELECT count(*)::int AS sessions,
           count(DISTINCT s.visitor_id)::int AS visitors,
           count(DISTINCT s.visitor_id) FILTER (WHERE EXISTS (
             SELECT 1 FROM sessions earlier
             WHERE earlier.visitor_id = s.visitor_id
               AND earlier.started_at < s.started_at
           ))::int AS returning_visitors,
           coalesce(round(avg(s.active_ms) / 1000), 0)::int AS avg_active_seconds,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM events e
             WHERE e.session_id = s.id AND e.type = 'cv_download'
           ))::int AS cv_sessions,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM events e
             WHERE e.session_id = s.id AND e.type = 'scene_enter'
           ))::int AS entered_building_sessions
    FROM sessions s
    WHERE ${IN_RANGE}`,

  daily: `
    WITH bounds AS (
      SELECT CASE
               WHEN $1::int IS NOT NULL THEN
                 (now() AT TIME ZONE '${DAY_ZONE}')::date - ($1::int - 1)
               ELSE coalesce(
                 (SELECT min(started_at AT TIME ZONE '${DAY_ZONE}')::date FROM sessions),
                 (now() AT TIME ZONE '${DAY_ZONE}')::date
               )
             END AS first_day
    ),
    days AS (
      SELECT generate_series(
        (SELECT first_day FROM bounds),
        (now() AT TIME ZONE '${DAY_ZONE}')::date,
        interval '1 day'
      )::date AS day
    ),
    counts AS (
      SELECT (s.started_at AT TIME ZONE '${DAY_ZONE}')::date AS day,
             count(*)::int AS sessions,
             count(DISTINCT s.visitor_id)::int AS visitors
      FROM sessions s
      WHERE ${IN_RANGE}
      GROUP BY 1
    )
    SELECT to_char(days.day, 'YYYY-MM-DD') AS day,
           coalesce(counts.sessions, 0) AS sessions,
           coalesce(counts.visitors, 0) AS visitors
    FROM days LEFT JOIN counts USING (day)
    ORDER BY days.day`,

  sources: breakdown("s.source"),
  countries: breakdown("s.country"),
  cities: breakdown(
    "nullif(concat_ws(', ', s.city, s.region, s.country), '')",
    "AND s.city IS NOT NULL"
  ),
  organisations: breakdown("s.org"),
  devices: breakdown("s.device_type"),
  browsers: breakdown("split_part(s.browser, ' ', 1)"),

  places: `
    SELECT CASE e.type
             WHEN 'scene_enter' THEN 'Building: ' || e.name
             WHEN 'open_item' THEN e.name
             ELSE 'Direct link: ' || e.path
           END AS label,
           count(*)::int AS sessions,
           count(DISTINCT s.visitor_id)::int AS visitors
    FROM events e
    JOIN sessions s ON s.id = e.session_id
    WHERE ${IN_RANGE}
      AND (e.type IN ('scene_enter', 'open_item')
           OR (e.type = 'page_view' AND e.path <> '/'))
    GROUP BY 1
    ORDER BY visitors DESC, sessions DESC, label
    LIMIT 25`,

  outbound: `
    SELECT e.name AS label,
           count(*)::int AS sessions,
           count(DISTINCT s.visitor_id)::int AS visitors
    FROM events e
    JOIN sessions s ON s.id = e.session_id
    WHERE ${IN_RANGE} AND e.type = 'outbound_click' AND e.name IS NOT NULL
    GROUP BY 1
    ORDER BY visitors DESC, sessions DESC, label
    LIMIT 12`,
};

export async function GET(request) {
  if (!isAuthenticated(request)) return json(401, { error: "Not logged in" });

  const sql = getSql();
  if (!sql) return json(503, { error: "Analytics is not configured" });

  const days = parseDays(request.url);
  try {
    const names = Object.keys(QUERIES);
    const results = await Promise.all(
      names.map((name) => sql.query(QUERIES[name], [days]))
    );
    const data = Object.fromEntries(
      names.map((name, index) => [name, results[index]])
    );
    return json(200, { ...data, totals: data.totals[0], days });
  } catch (error) {
    console.error("Failed to load overview:", error.message);
    return json(500, { error: "Failed to load overview" });
  }
}
