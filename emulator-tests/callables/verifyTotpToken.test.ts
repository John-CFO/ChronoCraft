//////////////////////// verifyTotpToken.test.ts //////////////////////////

// This file contains the unit tests for the verifyTotpToken callable.

////////////////////////////////////////////////////////////////////////////

import { beforeAll, describe, expect, it } from "vitest";
import { httpsCallable } from "firebase/functions";
import * as crypto from "crypto";

import { functions, ensureTestUser } from "../setup";

////////////////////////////////////////////////////////////////////////////

// define base32 alphabet
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// function to decode base32 (to use in hotp and totp testing)
function base32Decode(s: string): Uint8Array {
  const clean = s
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) throw new Error("Invalid Base32");
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// function to generate a TOTP (to use it in totp testing)
function hotp(secret: string, counter: number, digits = 6): string {
  const key = Buffer.from(base32Decode(secret));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, "0");
}

describe("verifyTotpToken", () => {
  beforeAll(async () => {
    await ensureTestUser();
  });

  it("should enable TOTP when token is valid", async () => {
    const createFn = httpsCallable<unknown, { secret: string }>(
      functions,
      "createTotpSecret",
    );

    const createRes = await createFn({});

    const secret = createRes.data.secret;
    const counter = Math.floor(Date.now() / 1000 / 30);
    const otp = hotp(secret, counter);

    const verifyFn = httpsCallable<
      { token: string },
      { valid: boolean; message: string }
    >(functions, "verifyTotpToken");

    const verifyRes = await verifyFn({ token: otp });

    expect(verifyRes.data.valid).toBe(true);
    expect(verifyRes.data.message).toBe("TOTP enabled successfully!");
  });
});
