export interface SmsProvider {
  sendOtp(phone: string, token: string): Promise<void>;
  sendMessage(phone: string, body: string): Promise<void>;
}
