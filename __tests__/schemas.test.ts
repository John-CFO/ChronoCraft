/////////////////////////////schemas.test.ts////////////////////////////

// This file is used to test the auth and firestore schemas

////////////////////////////////////////////////////////////////////////

import {
  LoginInputSchema,
  RegisterInputSchema,
  TotpCodeSchema,
} from "../validation/authSchemas";

import {
  FirestoreUserSchema,
  TOTPUserSchema,
} from "../validation/firestoreSchemas";

/////////////////////////////////////////////////////////////////////////

describe("Auth Schemas", () => {
  it("rejects empty password", () => {
    const r = LoginInputSchema.safeParse({ email: "a@b.c", password: "" });
    expect(r.success).toBe(false);
  });

  it("rejects no digits in password", () => {
    const r = RegisterInputSchema.safeParse({
      email: "a@b.c",
      password: "Abc!!Abc",
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid totp code", () => {
    expect(TotpCodeSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects invalid totp code", () => {
    expect(TotpCodeSchema.safeParse("12345").success).toBe(false);
  });
});

describe("Firestore Schemas", () => {
  it("accepts valid FirestoreUser data", () => {
    const data = {
      email: "user@example.com",
      firstLogin: true,
      totpEnabled: true,
      totpSecret: "SECRET123",
      hasSeenHomeTour: false,
    };
    expect(FirestoreUserSchema.safeParse(data).success).toBe(true);
  });

  it("applies defaults for missing optional fields", () => {
    const data = { email: "user@example.com" };
    const result = FirestoreUserSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstLogin).toBe(false);
      expect(result.data.totpEnabled).toBe(false);
      expect(result.data.hasSeenHomeTour).toBe(false);
    }
  });

  it("validates TOTPUser data correctly", () => {
    expect(
      TOTPUserSchema.safeParse({ totpEnabled: true, totpSecret: "SECRET123" })
        .success
    ).toBe(true);
    expect(TOTPUserSchema.safeParse({ totpEnabled: false }).success).toBe(true);
    expect(TOTPUserSchema.safeParse({ totpEnabled: "yes" }).success).toBe(
      false
    );
  });
});
