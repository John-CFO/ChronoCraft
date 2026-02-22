//////////////////// totpCore.crypto.unit.ts //////////////////////

// This file contains the TOTP Core Unit Tests for the crypto functions

//////////////////////////////////////////////////////////////////////////////

import {
  base32Encode,
  base32Decode,
  generateSecret,
  hotp,
} from "../../../src/security/totpCore";

//////////////////////////////////////////////////////////////////////////////

describe("TOTP Core – Encoding & Secret", () => {
  it("base32 roundtrip", () => {
    const buf = Buffer.from("hello world");
    const encoded = base32Encode(buf);
    const decoded = base32Decode(encoded);
    expect(Buffer.from(decoded).toString()).toBe(buf.toString());
  });

  it("base32 supports lowercase, spaces and dashes", () => {
    const s = generateSecret();
    const modified = s
      .toLowerCase()
      .match(/.{1,4}/g)
      ?.join("-")!;
    const decoded = base32Decode(modified);
    expect(base32Encode(decoded)).toBe(s);
  });

  it("invalid base32 throws", () => {
    expect(() => base32Decode("INVALID$CHAR")).toThrow();
  });

  it("generateSecret returns base32 string", () => {
    expect(generateSecret()).toMatch(/^[A-Z2-7]+$/);
  });

  it("generateSecret produces different secrets", () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });

  it("hotp supports 8 digits", () => {
    const secret = generateSecret();
    expect(hotp(secret, 1, 8)).toMatch(/^\d{8}$/);
  });

  it("supports very large counter", () => {
    const secret = generateSecret();
    expect(hotp(secret, 2 ** 40)).toMatch(/^\d{6}$/);
  });
});
