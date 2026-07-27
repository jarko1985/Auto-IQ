import type { SmsProvider } from "./types";
import { stubSmsProvider } from "./stub-provider";

export function getSmsProvider(): SmsProvider {
  // Wire real provider here (Twilio, Unifonic, etc.) in Sprint 5
  return stubSmsProvider;
}

export type { SmsProvider };
