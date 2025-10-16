////////////////////////////totp..sectest.ts////////////////////////////////

// This file is used to test the TOTP functions

////////////////////////////////////////////////////////////////////////

import {
  generateSecret,
  generateOtpAuthUrl,
  verifyToken,
} from "../components/utils/totp";

////////////////////////////////////////////////////////////////////////

describe("TOTP", () => {
  it("generates a secret", () => {
    expect(generateSecret()).toBeDefined();
  });

  it("creates a valid OTP Auth URL", () => {
    const url = generateOtpAuthUrl("SECRET123", "user@example.com");
    expect(url).toContain("otpauth://totp/");
  });

  it("verifies a token (mocked)", () => {
    const result = verifyToken("SECRET123", "123456");
    expect(typeof result).toBe("boolean");
  });
});
