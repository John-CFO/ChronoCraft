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
  FirestoreProjectSchema,
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

describe("Firestore Project Schema validation", () => {
  it("rejects object missing id or name", () => {
    expect(
      FirestoreProjectSchema.safeParse({ createdAt: new Date(), notes: [] })
        .success
    ).toBe(false);
  });

  it("rejects notes with missing fields", () => {
    const badNotes = [
      { text: "no content" }, // missing content
      { content: "ok", timestamp: "not a date" },
    ];
    const data = {
      id: "proj_1",
      name: "Test Project",
      createdAt: new Date(),
      notes: badNotes,
    };
    expect(FirestoreProjectSchema.safeParse(data).success).toBe(false);
  });

  it("rejects createdAt with wrong type", () => {
    const data = {
      id: "proj_2",
      name: "Test Project",
      createdAt: "2025-09-21",
      notes: [],
    };
    expect(FirestoreProjectSchema.safeParse(data).success).toBe(false);
  });

  it("accepts valid project", () => {
    const data = {
      id: "proj_3",
      name: "Valid Project",
      createdAt: new Date(),
      notes: [{ content: "note", timestamp: new Date() }],
    };
    expect(FirestoreProjectSchema.safeParse(data).success).toBe(true);
  });
});
