//////////////////////passwordResetSchemas.sec.test.ts////////////////////

// This file is used to test passoword validation with unit tests

/////////////////////////////////////////////////////////////////////

import { validateEmail } from "../validation/passwordResetSchemas.sec";

/////////////////////////////////////////////////////////////////////

describe("validateEmail", () => {
  it("returns normalized email for valid input", () => {
    expect(validateEmail("  TEST@Example.com ")).toBe("test@example.com");
  });

  it("returns null for invalid email", () => {
    expect(validateEmail("not-an-email")).toBeNull();
    expect(validateEmail("")).toBeNull();
  });
});
