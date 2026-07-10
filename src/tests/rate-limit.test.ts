import { describe, expect, it } from "vitest";

import { clearAttempts, isRateLimited, recordFailedAttempt } from "../lib/rate-limit";

describe("login rate limiting", () => {
  it("limits repeated failed login attempts and clears on success", () => {
    const key = `test-login:${crypto.randomUUID()}`;

    for (let index = 0; index < 5; index += 1) {
      recordFailedAttempt(key);
    }

    expect(isRateLimited(key)).toBe(true);
    clearAttempts(key);
    expect(isRateLimited(key)).toBe(false);
  });
});
