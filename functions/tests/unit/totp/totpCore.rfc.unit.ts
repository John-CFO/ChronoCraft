//////////////////// totpCore.rfc.unit.ts //////////////////////

// This file contains the TOTP Core Unit Tests for RFC4226 compliance

//////////////////////////////////////////////////////////////////////////////

import {
  hotp,
  base32Encode,
  base32Decode,
} from "../../../src/security/totpCore";

//////////////////////////////////////////////////////////////////////////////

describe("HOTP – RFC4226 compliance", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));

  const vectors = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];

  it("matches official RFC4226 test vectors", () => {
    vectors.forEach((expected, counter) => {
      expect(hotp(secret, counter)).toBe(expected);
    });
  });

  it("prints encoded secret", () => {
    console.log(base32Encode(Buffer.from("12345678901234567890")));
  });
});

describe("Base32 – roundtrip", () => {
  it("encodes and decodes losslessly", () => {
    const original = Buffer.from("12345678901234567890");
    const encoded = base32Encode(original);
    const decoded = Buffer.from(base32Decode(encoded));
    expect(decoded.equals(original)).toBe(true);
  });
});
