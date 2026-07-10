type AttemptRecord = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptRecord>();

export function isRateLimited(key: string, options = { limit: 5, windowMs: 60_000 }) {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt <= now) {
    return false;
  }

  return record.count >= options.limit;
}

export function recordFailedAttempt(key: string, options = { windowMs: 60_000 }) {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  attempts.set(key, { ...record, count: record.count + 1 });
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
