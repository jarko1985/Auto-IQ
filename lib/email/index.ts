import { env } from "@/lib/env";
import type { EmailProvider } from "./types";
import { consoleEmailProvider } from "./console-provider";
import { gmailEmailProvider } from "./gmail-provider";

export function getEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === "gmail") return gmailEmailProvider;
  return consoleEmailProvider;
}

export type { EmailProvider };
