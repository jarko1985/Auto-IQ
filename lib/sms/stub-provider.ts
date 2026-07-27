import { logger } from "@/lib/observability/logger";
import type { SmsProvider } from "./types";

export const stubSmsProvider: SmsProvider = {
  async sendOtp(phone, token) {
    logger.info({ phone, otp: token }, "[SMS-STUB] OTP");
  },
  async sendMessage(phone, body) {
    logger.info({ phone, body }, "[SMS-STUB] Message");
  },
};
