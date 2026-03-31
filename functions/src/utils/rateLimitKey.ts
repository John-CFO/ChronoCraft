// rateLimitKey.ts
import * as Crypto from "crypto";

export function hashRateLimitId(id: string, secret: string): string {
  return Crypto.createHmac("sha256", secret)
    .update(id, "utf8")
    .digest("base64url");
}
