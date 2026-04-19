/////////////////////////////// rateLimitAction.ts //////////////////////////////

// The rate limit action enumerates the different actions that can be rate limited.

///////////////////////////////////////////////////////////////////////////////

export const RATE_LIMIT_ACTIONS = {
  MFA_TOTP_ENROLL: "mfa_totp_enroll",
  MFA_TOTP_LOGIN: "mfa_totp_login",
  PASSWORD_RESET: "password_reset",
} as const;

export type RateLimitAction =
  (typeof RATE_LIMIT_ACTIONS)[keyof typeof RATE_LIMIT_ACTIONS];
