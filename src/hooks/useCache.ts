// Simple in-memory cache with TTL (default 5 minutes)
const cache = new Map<string, { data: any; expiry: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

export function setCached<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): T {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
