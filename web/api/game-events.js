// Deliberately not called "analytics" or "collect": ad blockers block those
// paths, which would hide exactly the visits this page exists to count.
import { getSql } from "./_lib/db.js";
import { clientIp, isSameOrigin, json } from "./_lib/http.js";
import { classifySource, isBot, parseUserAgent } from "./_lib/classify.js";
import { MAX_BODY_BYTES, sanitizePayload } from "./_lib/payload.js";
import { lookupOrganisation } from "./_lib/ipLookup.js";
import { MAX_EVENTS_PER_SESSION, tooManyNewSessions } from "./_lib/limits.js";

function decodeHeader(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function geoFromHeaders(headers) {
  const number = (name) => {
    const value = Number.parseFloat(headers.get(name));
    return Number.isFinite(value) ? value : null;
  };
  return {
    country: headers.get("x-vercel-ip-country"),
    region: headers.get("x-vercel-ip-country-region"),
    city: decodeHeader(headers.get("x-vercel-ip-city")),
    postalCode: headers.get("x-vercel-ip-postal-code"),
    latitude: number("x-vercel-ip-latitude"),
    longitude: number("x-vercel-ip-longitude"),
    timezone: headers.get("x-vercel-ip-timezone"),
  };
}

async function createSession(sql, request, payload) {
  const { context, sessionId, visitorId, activeMs } = payload;
  const headers = request.headers;
  const ip = clientIp(request);
  const userAgent = headers.get("user-agent");
  const device = parseUserAgent(userAgent);
  const geo = geoFromHeaders(headers);
  const organisation = await lookupOrganisation(ip);
  const source = classifySource({
    ref: context.ref,
    referrer: context.referrer,
    ownHost: headers.get("x-forwarded-host") || headers.get("host"),
  });

  // Two first batches can race, so the loser just adds its active time.
  await sql.query(
    `INSERT INTO sessions (
       id, visitor_id, active_ms, landing_path, referrer, source, ref, utm,
       ip, country, region, city, postal_code, latitude, longitude, timezone,
       org, isp, org_domain, user_agent, browser, os, device_type, device_model,
       is_bot, client
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13, $14, $15, $16,
       $17, $18, $19, $20, $21, $22, $23, $24,
       $25, $26
     )
     ON CONFLICT (id) DO UPDATE
       SET last_seen = now(), active_ms = sessions.active_ms + EXCLUDED.active_ms`,
    [
      sessionId,
      visitorId,
      activeMs,
      context.landingPath,
      context.referrer,
      source,
      context.ref,
      JSON.stringify(context.utm),
      ip,
      geo.country,
      geo.region,
      geo.city,
      geo.postalCode,
      geo.latitude,
      geo.longitude,
      geo.timezone,
      organisation.org,
      organisation.isp,
      organisation.orgDomain,
      userAgent?.slice(0, 500) ?? null,
      device.browser,
      device.os,
      device.deviceType,
      device.deviceModel,
      isBot(userAgent, context.client.webdriver === true),
      JSON.stringify(context.client),
    ]
  );
}

async function insertEvents(sql, sessionId, events) {
  if (events.length === 0) return;
  await sql.query(
    `INSERT INTO events (session_id, type, name, path, meta, occurred_at)
     SELECT $1::uuid, type, name, path, meta,
            now() - (age_ms * interval '1 millisecond')
     FROM jsonb_to_recordset($2::jsonb)
       AS e(type text, name text, path text, meta jsonb, age_ms double precision)
     WHERE (SELECT count(*) FROM events WHERE session_id = $1::uuid) < $3::int`,
    [
      sessionId,
      JSON.stringify(
        events.map(({ ageMs, ...event }) => ({ ...event, age_ms: ageMs }))
      ),
      MAX_EVENTS_PER_SESSION,
    ]
  );
}

export async function POST(request) {
  if (!isSameOrigin(request)) return json(403, { error: "Forbidden" });

  const sql = getSql();
  if (!sql) return json(503, { error: "Analytics is not configured" });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Too large" });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const payload = sanitizePayload(parsed);
  if (!payload) return json(400, { error: "Invalid payload" });

  try {
    const updated = await sql.query(
      `UPDATE sessions
         SET last_seen = now(), active_ms = active_ms + $2
       WHERE id = $1
       RETURNING id`,
      [payload.sessionId, payload.activeMs]
    );
    if (updated.length === 0) {
      if (await tooManyNewSessions(sql, clientIp(request))) {
        return json(429, { error: "Too many sessions" });
      }
      await createSession(sql, request, payload);
    }
    await insertEvents(sql, payload.sessionId, payload.events);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to record events:", error.message);
    return json(500, { error: "Failed to record events" });
  }
}
