import { adminPassword, passwordMatches, sessionCookie } from "../_lib/auth.js";
import { getSql } from "../_lib/db.js";
import { clientIp, isSameOrigin, json } from "../_lib/http.js";

const MAX_FAILURES = 10;
const MAX_PASSWORD_LENGTH = 200;

export async function POST(request) {
  if (!isSameOrigin(request)) return json(403, { error: "Forbidden" });

  // Fail closed: with no password configured, nothing can log in.
  const sql = getSql();
  if (!adminPassword() || !sql) {
    return json(503, { error: "Admin is not configured" });
  }

  let password;
  try {
    ({ password } = await request.json());
  } catch {
    return json(400, { error: "Invalid request" });
  }
  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) {
    return json(400, { error: "Invalid request" });
  }

  const ip = clientIp(request) ?? "unknown";
  const [{ failures }] = await sql.query(
    `SELECT count(*)::int AS failures FROM login_attempts
     WHERE ip = $1 AND attempted_at > now() - interval '15 minutes'`,
    [ip]
  );
  if (failures >= MAX_FAILURES) {
    return json(429, { error: "Too many attempts. Try again in 15 minutes." });
  }

  if (!passwordMatches(password)) {
    await sql.query(`INSERT INTO login_attempts (ip) VALUES ($1)`, [ip]);
    await sql.query(
      `DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`
    );
    return json(401, { error: "Wrong password" });
  }

  await sql.query(`DELETE FROM login_attempts WHERE ip = $1`, [ip]);
  return json(200, { ok: true }, { "Set-Cookie": sessionCookie(request) });
}
