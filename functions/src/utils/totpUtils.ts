//src/utils/totpUtils.ts
export function verifyTOTP(secret: string, code: string): boolean {
  return secret === code;
}
