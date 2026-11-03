import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

const sha256 = (value) => createHash("sha256").update(value).digest();

const safeEqual = (a, b) => timingSafeEqual(sha256(a), sha256(b));

// Signing with the password means changing it logs out every existing session.
const sign = (expiresAt, password) =>
  createHmac("sha256", password)
    .update(`admin-session:${expiresAt}`)
    .digest("base64url");

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || null;
}

export function passwordMatches(candidate, password = adminPassword()) {
  if (!password || typeof candidate !== "string" || !candidate) return false;
  return safeEqual(candidate, password);
}

export function createSessionToken(
  password = adminPassword(),
  now = Date.now()
) {
  const expiresAt = Math.floor(now / 1000) + SESSION_SECONDS;
  return `${expiresAt}.${sign(expiresAt, password)}`;
}

export function isValidSessionToken(
  token,
  password = adminPassword(),
  now = Date.now()
) {
  if (!password || typeof token !== "string") return false;
  const [expiresAt, signature] = token.split(".");
  if (!/^\d+$/.test(expiresAt ?? "") || !signature) return false;
  if (Number(expiresAt) <= now / 1000) return false;
  return safeEqual(signature, sign(expiresAt, password));
}

function readCookie(request, name) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator !== -1 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

export function isAuthenticated(request) {
  return isValidSessionToken(readCookie(request, COOKIE_NAME));
}

function cookieAttributes(request) {
  const host = request.headers.get("host") ?? "";
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  return `Path=/api/admin; HttpOnly; SameSite=Strict${isLocal ? "" : "; Secure"}`;
}

export function sessionCookie(request) {
  return `${COOKIE_NAME}=${createSessionToken()}; Max-Age=${SESSION_SECONDS}; ${cookieAttributes(request)}`;
}

export function clearedCookie(request) {
  return `${COOKIE_NAME}=; Max-Age=0; ${cookieAttributes(request)}`;
}
