export const SESSION_ROLE_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

/** Whether auth.ts's jwt callback should re-fetch role/status from the DB this
 * invocation, instead of trusting the token's cached values. `lastCheckedAtMs`
 * is `undefined` for a token that predates this field (e.g. issued before this
 * change shipped) — treated as due for a check. */
export function shouldRefreshSessionRole(
  lastCheckedAtMs: number | undefined,
  nowMs: number,
  thresholdMs: number = SESSION_ROLE_RECHECK_INTERVAL_MS,
): boolean {
  if (lastCheckedAtMs === undefined) return true;
  return nowMs - lastCheckedAtMs >= thresholdMs;
}
