import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const SIGNUP_TICKET_PURPOSE = "signup";
const SIGNUP_TICKET_TTL = "15m";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

/** Short-lived proof that `email` completed OTP verification — carried by the client
 * between the verify-otp and complete-signup steps. Nothing is persisted to the User
 * table until complete-signup succeeds, so this ticket is the only record of the
 * OTP-verified state in between. */
export async function signSignupTicket(email: string): Promise<string> {
  return new SignJWT({ email, purpose: SIGNUP_TICKET_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SIGNUP_TICKET_TTL)
    .sign(secretKey());
}

export async function verifySignupTicket(ticket: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(ticket, secretKey());
    if (payload.purpose !== SIGNUP_TICKET_PURPOSE || typeof payload.email !== "string") {
      return null;
    }
    return { email: payload.email };
  } catch {
    // Expired, malformed, or signature mismatch — all treated the same: invalid ticket.
    return null;
  }
}
