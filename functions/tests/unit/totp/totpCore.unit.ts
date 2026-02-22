//////////////////// totpCore.unit.ts ///////////////////////////////

// This file contains the TOTP Core Unit Tests

//////////////////////////////////////////////////////////////////////////////

import { hotp } from "../../../src/security/totpCore";
import { base32Encode, base32Decode } from "../../../src/security/totpCore";

//////////////////////////////////////////////////////////////////////////////

describe("TOTP Core – Basic Encoding & HOTP behavior", () => {
  const FIXED_SECRET = "KRSXG5A2FNFYCAZQ";

  it("base32 roundtrip", () => {
    const buf = Buffer.from("hello world");
    const encoded = base32Encode(buf);
    const decoded = base32Decode(encoded);
    expect(Buffer.from(decoded).toString()).toBe(buf.toString());
  });

  it("invalid base32 throws", () => {
    expect(() => base32Decode("INVALID$CHAR")).toThrow();
  });

  it("hotp preserves leading zeros", () => {
    const token = hotp(FIXED_SECRET, 1);
    expect(token.length).toBe(6);
    expect(/^\d{6}$/.test(token)).toBe(true);
  });
});
