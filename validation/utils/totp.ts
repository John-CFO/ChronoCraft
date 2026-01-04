/////////////////////////////////////totp.ts////////////////////////////////////

// This file is used to generate and validate TOTP codes to implement 2FA
// It is based on RFC 4226 and RFC 6238 and uses jssha for HMAC-SHA1 computation
// And uses expo-crypto for secure random number generation

////////////////////////////////////////////////////////////////////////////////

import * as Crypto from "expo-crypto";
import JsSHA from "jssha";

////////////////////////////////////////////////////////////////////////////////

// define Base32 alphabet
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// function to encode a Uint8Array to Base32 string
function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output; // no padding
}

// function to decode a Base32 string to Uint8Array
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
    if (idx === -1) throw new Error("Invalid Base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// generate a Base32 secret (secure random)
export const generateSecret = (sizeBytes = 20): string => {
  const rnd = Crypto.getRandomBytes(sizeBytes);
  return base32Encode(new Uint8Array(rnd));
};

// generate the OtpAuth URL for a given secret
export const generateOtpAuthUrl = (
  secretBase32: string,
  label: string, // e.g. "ChronoCraft:email@example.com"
  issuer = "ChronoCraft",
  period = 30,
  digits = 6,
  algorithm = "SHA1"
) => {
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm,
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

// Helper function: hex string -> Uint8Array
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) hex = "0" + hex; // safety
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16); // modernized
  }
  return out;
}

// function to generate a HMAC-SHA1 HOTP token for a given counter
function hotp(secretBase32: string, counter: number, digits = 6): string {
  const key = base32Decode(secretBase32);

  // counter -> 8 byte big-endian
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c >>>= 8;
  }

  const shaObj = new JsSHA("SHA-1", "UINT8ARRAY");
  shaObj.setHMACKey(key, "UINT8ARRAY");
  shaObj.update(counterBytes);
  const hmacHex = shaObj.getHMAC("HEX") as string;
  const hmac = hexToBytes(hmacHex);

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, "0");
}

// generate a TOTP token
export const generateTotp = (
  secretBase32: string,
  forTime = Date.now(),
  step = 30,
  digits = 6
): string => {
  const counter = Math.floor(forTime / 1000 / step); // simplified
  return hotp(secretBase32, counter, digits);
};

// verify a TOTP token with window (+-steps)
export const verifyToken = (
  secretBase32: string,
  token: string,
  window = 1,
  step = 30,
  digits = 6
): boolean => {
  const now = Date.now();
  const currentCounter = Math.floor(now / 1000 / step); // simplified
  for (let i = -window; i <= window; i++) {
    if (hotp(secretBase32, currentCounter + i, digits) === token) {
      return true;
    }
  }
  return false;
};
