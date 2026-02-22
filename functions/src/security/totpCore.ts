// ///////////////////////// totpCore.ts /////////////////////////////

// This file contains the crypto and core functions for TOTP (Time-based One-Time Password).
// It implements Base32-Encoding/Decoding, Secret generation,
// HOTP (RFC 4226) and TOTP (RFC 6238) verification logic.

// ================================================================
// Security-Reminder:

// 1. The secret is a cryptographically random value and has
//    **no intrinsic connection to the user ID**.

// 2. The binding between user ↔ secret must be enforced
//    via Firestore structure and security rules:
//
//    Example path:
//    - users/{uid}/totp
//    - or a dedicated mfa_totp collection
//
//    Firestore rules must ensure only the authenticated UID
//    can access its own secret metadata.

// 3. If the database is compromised, an attacker with access
//    to the raw secret can generate valid OTPs.
//    Therefore, secrets should be encrypted at rest.
//    Decryption must happen only inside a trusted Cloud Function.

// 4. This module only ensures correct OTP calculation.
//    It does NOT protect the secrecy of the secret.

//    Access to secret = ability to generate OTP.

// 5. Brute-force protection, rate limiting, logging and lockout
//    must be handled outside this core module
//    (e.g. in the login or verification flow).

// //////////////////////////////////////////////////////////////

import * as Crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Base32 Encode (RFC 4648 compliant, no padding).
 *
 * - MSB-first bit processing
 * - Remaining bits are right-padded into a 5-bit block
 * - No '=' padding is added (Google Authenticator compatible)
 *
 * Used to convert random secret bytes into a human-readable
 * Base32 string for provisioning (QR code / manual entry).
 */
export function base32Encode(data: Uint8Array): string {
  if (data.length === 0) return "";

  let out = "";
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < data.length; i++) {
    buffer = (buffer << 8) | data[i];
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      const index = (buffer >> bitsLeft) & 0x1f;
      out += BASE32_ALPHABET[index];
    }
  }

  if (bitsLeft > 0) {
    // Remaining bits are shifted into a full 5-bit block
    const index = (buffer & ((1 << bitsLeft) - 1)) << (5 - bitsLeft);
    out += BASE32_ALPHABET[index];
  }

  return out;
}

/**
 * Base32 Decode (RFC 4648 strict decoding).
 *
 * - Removes whitespace and hyphens
 * - Accepts optional '=' padding
 * - Rejects invalid characters
 * - Rejects non-zero leftover bits (detects corrupted input)
 *
 * Converts the stored Base32 secret back to raw bytes
 * for HMAC processing.
 */
export function base32Decode(str: string): Uint8Array {
  if (!str) return new Uint8Array(0);

  let cleaned = str.replace(/[-\s]/g, "").toUpperCase();
  cleaned = cleaned.replace(/=+$/, "");

  let buffer = 0;
  let bitsLeft = 0;
  const out: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid Base32 character: ${ch}`);

    buffer = (buffer << 5) | idx;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      const byte = (buffer >> bitsLeft) & 0xff;
      out.push(byte);
      buffer = buffer & ((1 << bitsLeft) - 1);
    }
  }

  if (bitsLeft > 0) {
    // If remaining bits are non-zero, input was malformed
    if (buffer !== 0) {
      throw new Error("Invalid base32: non-zero leftover bits");
    }
  }

  return Uint8Array.from(out);
}

/**
 * Generates a cryptographically secure random secret.
 *
 * Default: 20 bytes (160 bits), as recommended by RFC 4226.
 * Returned as Base32 string for storage and provisioning.
 */
export function generateSecret(size = 20): string {
  return base32Encode(Crypto.randomBytes(size));
}

/**
 * HOTP implementation (RFC 4226).
 *
 * Steps:
 * 1. Decode Base32 secret to raw bytes
 * 2. Create 64-bit Big-Endian counter buffer
 * 3. HMAC-SHA1(secret, counter)
 * 4. Dynamic truncation
 * 5. Modulo 10^digits
 *
 * This function performs only deterministic OTP calculation.
 */
export function hotp(secret: string, counter: number, digits = 6): string {
  const key = Buffer.from(base32Decode(secret));

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = Crypto.createHmac("sha1", key).update(counterBuffer).digest();

  // Dynamic truncation offset
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0xff) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary & 0x7fffffff) % 10 ** digits;

  return otp.toString().padStart(digits, "0");
}

/**
 * TOTP verification (RFC 6238).
 *
 * - Time step: 30 seconds
 * - Uses HOTP internally with time-based counter
 * - Allows configurable ±window steps (default = 1)
 *
 * NOTE:
 * This function does NOT implement rate limiting or
 * constant-time comparison.
 * Those protections must be enforced externally.
 */
export function verifyTotp(
  secret: string,
  token: string,
  window = 1,
  now: number = Date.now(),
): boolean {
  const counter = Math.floor(now / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === token) return true;
  }

  return false;
}
