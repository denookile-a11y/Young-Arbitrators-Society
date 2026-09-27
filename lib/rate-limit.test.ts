import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const config = { name: "test-under", windowMs: 60_000, max: 3 };
    expect(checkRateLimit("1.2.3.4", config).ok).toBe(true);
    expect(checkRateLimit("1.2.3.4", config).ok).toBe(true);
    expect(checkRateLimit("1.2.3.4", config).ok).toBe(true);
  });

  it("rejects requests once the limit is exceeded within the window", () => {
    const config = { name: "test-over", windowMs: 60_000, max: 2 };
    expect(checkRateLimit("5.6.7.8", config).ok).toBe(true);
    expect(checkRateLimit("5.6.7.8", config).ok).toBe(true);
    const third = checkRateLimit("5.6.7.8", config);
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks separate keys independently", () => {
    const config = { name: "test-independent", windowMs: 60_000, max: 1 };
    expect(checkRateLimit("9.9.9.9", config).ok).toBe(true);
    // A different identifier gets its own bucket, unaffected by the first.
    expect(checkRateLimit("10.10.10.10", config).ok).toBe(true);
    // The first identifier is now over its own limit.
    expect(checkRateLimit("9.9.9.9", config).ok).toBe(false);
  });

  it("tracks separate endpoint names independently for the same identifier", () => {
    expect(checkRateLimit("1.1.1.1", { name: "endpoint-a", windowMs: 60_000, max: 1 }).ok).toBe(
      true
    );
    // Same identifier, different endpoint name — separate bucket.
    expect(checkRateLimit("1.1.1.1", { name: "endpoint-b", windowMs: 60_000, max: 1 }).ok).toBe(
      true
    );
  });

  it("resets the count after the window elapses", async () => {
    vi.useFakeTimers();
    const config = { name: "test-reset", windowMs: 1000, max: 1 };
    expect(checkRateLimit("2.2.2.2", config).ok).toBe(true);
    expect(checkRateLimit("2.2.2.2", config).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("2.2.2.2", config).ok).toBe(true);
    vi.useRealTimers();
  });
});
