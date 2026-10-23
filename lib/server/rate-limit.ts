import "server-only";

// Limitador en memoria por clave (IP). Suficiente para desarrollo y un solo proceso.
// TODO(supabase): en Vercel cada instancia tiene su propia memoria; mover a una tabla o a Upstash.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

export function isBlocked(key: string, now = Date.now()): boolean {
  const h = hits.get(key);
  return !!h && h.resetAt > now && h.count >= MAX_FAILURES;
}

export function recordFailure(key: string, now = Date.now()): void {
  const h = hits.get(key);
  if (!h || h.resetAt <= now) hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else h.count++;
}
