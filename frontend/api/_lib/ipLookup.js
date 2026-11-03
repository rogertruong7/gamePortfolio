const PRIVATE_IP = /^(::1$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|f[cd]|fe80)/i;
const NO_ORG = { org: null, isp: null, orgDomain: null };

// Best effort: a slow or failed lookup must never lose the visit itself.
export async function lookupOrganisation(ip, fetcher = fetch) {
  if (!ip || PRIVATE_IP.test(ip)) return NO_ORG;
  try {
    const response = await fetcher(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,connection`,
      { signal: AbortSignal.timeout(1500) }
    );
    if (!response.ok) return NO_ORG;
    const body = await response.json();
    if (!body.success) return NO_ORG;
    return {
      org: body.connection?.org || null,
      isp: body.connection?.isp || null,
      orgDomain: body.connection?.domain || null,
    };
  } catch {
    return NO_ORG;
  }
}
