///////////////// passwordResetSchemas.client.test.ts ////////////////////

// This file is used to test the validation functions for password reset emails

//////////////////////////////////////////////////////////////////////////

import { validateEmail } from "../validation/passwordResetSchemas";

/////////////////////////////////////////////////////////////////////////

describe("validateEmail (client)", () => {
  it("returns normalized email for valid input", () => {
    const result = validateEmail("  User@Example.COM ");
    expect(result).toBe("user@example.com");
  });

  it("returns null for missing @", () => {
    const result = validateEmail("userexample.com");
    expect(result).toBeNull();
  });

  it("returns null for missing domain", () => {
    const result = validateEmail("user@");
    expect(result).toBeNull();
  });

  it("returns null for missing dot in domain", () => {
    const result = validateEmail("user@example");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = validateEmail("");
    expect(result).toBeNull();
  });

  it("returns null for whitespace only", () => {
    const result = validateEmail("   ");
    expect(result).toBeNull();
  });
});
