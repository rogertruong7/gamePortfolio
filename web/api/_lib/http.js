export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

// Vercel sets x-real-ip itself, so a visitor cannot spoof it.
export function clientIp(request) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("x-real-ip") || forwarded || null;
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin beacons from older browsers omit it.
  try {
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
