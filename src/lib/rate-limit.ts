import "server-only";

// Best-effort, in-memory sliding-window limiter. It resets whenever the
// server process restarts and isn't shared across instances, so on a
// multi-instance deploy it under-counts rather than over-blocks -- fine as a
// first line of defense for the public /api/leads endpoint. If abuse becomes
// a real problem, swap this for a shared store (e.g. Upstash Redis) without
// changing the call site.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);

  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }

  return recent.length > limit;
}
