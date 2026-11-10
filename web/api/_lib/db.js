import { neon } from "@neondatabase/serverless";

let client;

// Returns the Neon HTTP client, or null when DATABASE_URL is not configured.
export function getSql() {
  if (!process.env.DATABASE_URL) return null;
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
