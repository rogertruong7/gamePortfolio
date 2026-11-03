import { clearedCookie } from "../_lib/auth.js";
import { json } from "../_lib/http.js";

export async function POST(request) {
  return json(200, { ok: true }, { "Set-Cookie": clearedCookie(request) });
}
