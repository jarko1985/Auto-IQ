import { describe, it, expect } from "vitest";
import { shouldRefreshSessionRole } from "@/features/auth/session-refresh";

describe("shouldRefreshSessionRole", () => {
  const FIVE_MIN = 5 * 60 * 1000;

  it("is due when there is no prior check timestamp", () => {
    expect(shouldRefreshSessionRole(undefined, Date.now())).toBe(true);
  });

  it("is not due when the interval hasn't elapsed", () => {
    const now = 1_000_000;
    expect(shouldRefreshSessionRole(now - FIVE_MIN + 1000, now)).toBe(false);
  });

  it("is due once the interval has fully elapsed", () => {
    const now = 1_000_000;
    expect(shouldRefreshSessionRole(now - FIVE_MIN, now)).toBe(true);
  });

  it("respects a custom threshold", () => {
    const now = 1_000_000;
    expect(shouldRefreshSessionRole(now - 1000, now, 500)).toBe(true);
    expect(shouldRefreshSessionRole(now - 100, now, 500)).toBe(false);
  });
});
