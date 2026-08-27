////////////////////// authSchemas.client.test.ts ////////////////////////

// This file is used to validate user inputs for login and registration

//////////////////////////////////////////////////////////////////////////

import {
  createLoginInputSchema,
  createRegisterInputSchema,
  TotpCodeSchema,
} from "../validation/authSchemas";

/////////////////////////////////////////////////////////////////////////

describe("LoginInputSchema (client)", () => {
  it("accepts valid login input", () => {
    const result = createLoginInputSchema().safeParse({
      email: "user@test.com",
      password: "secret",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createLoginInputSchema().safeParse({
      email: "not-an-email",
      password: "secret",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = createLoginInputSchema().safeParse({
      email: "user@test.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("RegisterInputSchema (client)", () => {
  it("accepts valid registration input", () => {
    const result = createRegisterInputSchema().safeParse({
      email: "user@test.com",
      password: "Ab!1_cd$",
    });

    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = createRegisterInputSchema().safeParse({
      email: "user@test.com",
      password: "A!1$a",
    });

    expect(result.success).toBe(false);
  });

  it("rejects password with less than 2 special characters", () => {
    const result = createRegisterInputSchema().safeParse({
      email: "user@test.com",
      password: "Password1!",
    });

    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = createRegisterInputSchema().safeParse({
      email: "user@test.com",
      password: "Password!!",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = createRegisterInputSchema().safeParse({
      email: "user@",
      password: "Ab!1_cd$",
    });

    expect(result.success).toBe(false);
  });
});

describe("TotpCodeSchema (client)", () => {
  it("accepts valid 6-digit TOTP", () => {
    const result = TotpCodeSchema.safeParse("123456");
    expect(result.success).toBe(true);
  });

  it("rejects TOTP with letters", () => {
    const result = TotpCodeSchema.safeParse("12a456");
    expect(result.success).toBe(false);
  });

  it("rejects TOTP shorter than 6 digits", () => {
    const result = TotpCodeSchema.safeParse("12345");
    expect(result.success).toBe(false);
  });

  it("rejects TOTP longer than 6 digits", () => {
    const result = TotpCodeSchema.safeParse("1234567");
    expect(result.success).toBe(false);
  });
});
