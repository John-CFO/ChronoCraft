///////////////// env.ts ////////////////////////

// This file is used to store environment variables

/////////////////////////////////////////////////

import dotenv from "dotenv";
import path from "path";

/////////////////////////////////////////////////

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

function requireEnv(name: string, value?: string): string {
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export const env = {
  RATE_LIMIT_HMAC_KEY: requireEnv(
    "RATE_LIMIT_HMAC_KEY",
    process.env.RATE_LIMIT_HMAC_KEY,
  ),

  TOTP_ENCRYPTION_KEY: requireEnv(
    "TOTP_ENCRYPTION_KEY",
    process.env.TOTP_ENCRYPTION_KEY,
  ),
};
