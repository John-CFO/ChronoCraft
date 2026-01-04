//////////////////// totpService.unit.ts ///////////////////////////////

// This file contains the unit tests for the TOTP Utils class.

////////////////////////////////////////////////////////////////////////

import { verifyTOTP } from "../../../src/utils/totpUtils";

////////////////////////////////////////////////////////////////////////

describe("TOTP Utils Unit Tests", () => {
  it("should return true for matching codes", () => {
    expect(verifyTOTP("SECRET", "SECRET")).toBe(true);
  });

  it("should return false for non-matching codes", () => {
    expect(verifyTOTP("SECRET", "123456")).toBe(false);
  });
});
