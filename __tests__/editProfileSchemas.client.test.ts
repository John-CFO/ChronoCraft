///////////////////////// editProfileSchemas.client.test.ts //////////////////////

// This file is used to validate user inputs for updates to a user's profile

//////////////////////////////////////////////////////////////////////////////////

import { FirestoreUserUpdateSchema } from "../validation/editProfileSchemas";

//////////////////////////////////////////////////////////////////////////////////

describe("FirestoreUserUpdateSchema (client)", () => {
  it("accepts empty object (no update)", () => {
    const result = FirestoreUserUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid displayName", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      displayName: "John Doe",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("John Doe");
    }
  });

  it("transforms empty displayName to undefined", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      displayName: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeUndefined();
    }
  });

  it("rejects displayName longer than 100 chars", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      displayName: "a".repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid personalID", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      personalID: "User_123-ABC",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personalID).toBe("User_123-ABC");
    }
  });

  it("transforms empty personalID to undefined", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      personalID: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personalID).toBeUndefined();
    }
  });

  it("rejects personalID with invalid characters", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      personalID: "invalid id!",
    });

    expect(result.success).toBe(false);
  });

  it("rejects personalID shorter than 4 chars", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      personalID: "abc",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid photoURL", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      photoURL: "https://example.com/avatar.png",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid photoURL", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      photoURL: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const result = FirestoreUserUpdateSchema.safeParse({
      displayName: "John",
      isAdmin: true,
    });

    expect(result.success).toBe(false);
  });
});
