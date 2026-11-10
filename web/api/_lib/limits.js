// Far above what a real visitor reaches, even one behind a shared office network.
export const MAX_NEW_SESSIONS_PER_HOUR = 30;
export const MAX_EVENTS_PER_SESSION = 500;

// Run before a new session is created, because each one also costs an ipwho.is lookup.
export async function tooManyNewSessions(sql, ip) {
  if (!ip) return false;
  const [{ recent }] = await sql.query(
    `SELECT count(*)::int AS recent FROM sessions
     WHERE ip = $1 AND started_at > now() - interval '1 hour'`,
    [ip]
  );
  return recent >= MAX_NEW_SESSIONS_PER_HOUR;
}
