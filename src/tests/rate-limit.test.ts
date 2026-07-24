import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildLoginRateLimitKey,
  clearAttempts,
  getRateLimitOptions,
  isRateLimited,
  RateLimitUnavailableError,
  recordFailedAttempt,
  resolveRateLimitBackend
} from "../lib/rate-limit";

describe("login rate limiting", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("limits repeated failed login attempts and clears on success", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "memory");
    const key = `test-login:${crypto.randomUUID()}`;

    for (let index = 0; index < 5; index += 1) {
      await recordFailedAttempt(key);
    }

    expect(await isRateLimited(key)).toBe(true);
    await clearAttempts(key);
    expect(await isRateLimited(key)).toBe(false);
  });

  it("builds login keys from normalized hashed emails", () => {
    const key = buildLoginRateLimitKey(" Student@Example.COM ");

    expect(key).toMatch(/^login:[a-f0-9]{64}$/);
    expect(key).not.toContain("Student");
    expect(key).toBe(buildLoginRateLimitKey("student@example.com"));
  });

  it("chooses Upstash, TCP Redis, or memory from environment", () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "auto");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    expect(resolveRateLimitBackend()).toBe("upstash");

    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(resolveRateLimitBackend()).toBe("redis");

    vi.stubEnv("REDIS_URL", "");
    expect(resolveRateLimitBackend()).toBe("memory");

    vi.stubEnv("RATE_LIMIT_BACKEND", "memory");
    expect(resolveRateLimitBackend()).toBe("memory");
  });

  it("parses custom limits with safe defaults", () => {
    vi.stubEnv("AUTH_RATE_LIMIT_ATTEMPTS", "3");
    vi.stubEnv("AUTH_RATE_LIMIT_WINDOW_MS", "15000");
    expect(getRateLimitOptions()).toEqual({ limit: 3, windowMs: 15_000 });

    vi.stubEnv("AUTH_RATE_LIMIT_ATTEMPTS", "-1");
    vi.stubEnv("AUTH_RATE_LIMIT_WINDOW_MS", "not-a-number");
    expect(getRateLimitOptions()).toEqual({ limit: 5, windowMs: 60_000 });
  });

  it("falls back to memory outside production when Redis is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RATE_LIMIT_BACKEND", "upstash");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    await expect(recordFailedAttempt(`fallback:${crypto.randomUUID()}`)).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it("fails closed in production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_BACKEND", "upstash");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    await expect(isRateLimited(`production:${crypto.randomUUID()}`)).rejects.toBeInstanceOf(
      RateLimitUnavailableError
    );
  });
});
