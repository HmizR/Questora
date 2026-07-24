import "server-only";

import { createHash } from "node:crypto";

import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitBackend = "auto" | "memory" | "upstash" | "redis";

type AttemptRecord = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  getCount(key: string): Promise<number>;
  increment(key: string, windowMs: number): Promise<void>;
  clear(key: string): Promise<void>;
};

const DEFAULT_OPTIONS: RateLimitOptions = {
  limit: 5,
  windowMs: 60_000
};

const attempts = new Map<string, AttemptRecord>();

let upstashClient: UpstashRedis | null = null;
let tcpRedisClient: Redis | null = null;
let warnedAboutFallback = false;

export class RateLimitUnavailableError extends Error {
  constructor(message = "Rate limit store is unavailable.") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

const memoryStore: RateLimitStore = {
  async getCount(key) {
    const now = Date.now();
    const record = attempts.get(key);

    if (!record || record.resetAt <= now) {
      attempts.delete(key);
      return 0;
    }

    return record.count;
  },
  async increment(key, windowMs) {
    const now = Date.now();
    const record = attempts.get(key);

    if (!record || record.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    attempts.set(key, { ...record, count: record.count + 1 });
  },
  async clear(key) {
    attempts.delete(key);
  }
};

function getUpstashStore(): RateLimitStore {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new RateLimitUnavailableError("Upstash Redis is not configured.");
  }

  upstashClient ??= new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });

  return {
    async getCount(key) {
      const value = await upstashClient?.get<number | string>(key);
      return Number(value ?? 0);
    },
    async increment(key, windowMs) {
      const count = await upstashClient?.incr(key);
      if (count === 1) {
        await upstashClient?.expire(key, Math.ceil(windowMs / 1000));
      }
    },
    async clear(key) {
      await upstashClient?.del(key);
    }
  };
}

function getTcpRedisStore(): RateLimitStore {
  if (!process.env.REDIS_URL) {
    throw new RateLimitUnavailableError("TCP Redis is not configured.");
  }

  tcpRedisClient ??= new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  return {
    async getCount(key) {
      const value = await tcpRedisClient?.get(key);
      return Number(value ?? 0);
    },
    async increment(key, windowMs) {
      const count = await tcpRedisClient?.incr(key);
      if (count === 1) {
        await tcpRedisClient?.pexpire(key, windowMs);
      }
    },
    async clear(key) {
      await tcpRedisClient?.del(key);
    }
  };
}

export function getRateLimitOptions(): RateLimitOptions {
  return {
    limit: parsePositiveInteger(process.env.AUTH_RATE_LIMIT_ATTEMPTS, DEFAULT_OPTIONS.limit),
    windowMs: parsePositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, DEFAULT_OPTIONS.windowMs)
  };
}

export function getRateLimitBackend(): RateLimitBackend {
  const backend = process.env.RATE_LIMIT_BACKEND;

  if (backend === "memory" || backend === "upstash" || backend === "redis") {
    return backend;
  }

  return "auto";
}

export function resolveRateLimitBackend() {
  const backend = getRateLimitBackend();

  if (backend === "upstash") {
    return "upstash";
  }

  if (backend === "redis") {
    return "redis";
  }

  if (backend === "memory") {
    return "memory";
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return "upstash";
  }

  if (process.env.REDIS_URL) {
    return "redis";
  }

  return "memory";
}

export function buildLoginRateLimitKey(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const digest = createHash("sha256").update(normalizedEmail).digest("hex");
  return `login:${digest}`;
}

export async function isRateLimited(key: string, options = getRateLimitOptions()) {
  return withRateLimitStore(async (store) => {
    const count = await store.getCount(key);
    return count >= options.limit;
  });
}

export async function recordFailedAttempt(key: string, options = getRateLimitOptions()) {
  await withRateLimitStore(async (store) => {
    await store.increment(key, options.windowMs);
    return undefined;
  });
}

export async function clearAttempts(key: string) {
  await withRateLimitStore(async (store) => {
    await store.clear(key);
    return undefined;
  });
}

async function withRateLimitStore<T>(operation: (store: RateLimitStore) => Promise<T>) {
  const backend = resolveRateLimitBackend();

  try {
    const store =
      backend === "upstash" ? getUpstashStore() : backend === "redis" ? getTcpRedisStore() : memoryStore;
    return await operation(store);
  } catch (error) {
    if (backend === "memory" || shouldFallbackToMemory()) {
      warnAboutMemoryFallback(error);
      return operation(memoryStore);
    }

    throw new RateLimitUnavailableError();
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function shouldFallbackToMemory() {
  return process.env.NODE_ENV !== "production";
}

function warnAboutMemoryFallback(error: unknown) {
  if (warnedAboutFallback) {
    return;
  }

  warnedAboutFallback = true;
  const message = error instanceof Error ? error.message : "Unknown Redis error";
  console.warn(`Redis rate limit unavailable; falling back to in-memory limiter. ${message}`);
}
