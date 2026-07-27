import crypto from "node:crypto";
import { env } from "@/lib/env";

/** Cryptographically strong 6-digit code (unlike PhoneOtpToken's Math.random). */
export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/** HMAC-SHA256 keyed with AUTH_SECRET — EmailOtpToken stores this, never the raw code. */
export function hashOtpCode(code: string): string {
  return crypto.createHmac("sha256", env.AUTH_SECRET).update(code).digest("hex");
}
