/////////////////////////////schemas.sec.test.ts////////////////////////////

// This file is used to test the auth and firestore schemas

////////////////////////////////////////////////////////////////////////

import {
  LoginInputSchema,
  RegisterInputSchema,
  TotpCodeSchema,
} from "../validation/authSchemas.sec";

import {
  FirestoreUserSchema,
  FirestoreProjectSchema,
  TOTPUserSchema,
} from "../validation/firestoreSchemas.sec";

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
      hasSeenDetailsTour: true,
    };
    expect(FirestoreUserSchema.safeParse(data).success).toBe(true);
  });

  // HomeScreen Login/TOTP/Tour
  it("applies defaults for missing optional fields", () => {
    const data = { email: "user@example.com" };
    const result = FirestoreUserSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstLogin).toBe(false);
      expect(result.data.totpEnabled).toBe(false);
      expect(result.data.hasSeenHomeTour).toBe(false);
      expect(result.data.hasSeenDetailsTour).toBe(false);
    }
  });

  // DetailsScreen Tour
  it("applies defaults for details tour flag", () => {
    const data = { email: "user@example.com" };
    const result = FirestoreUserSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.hasSeenDetailsTour).toBe(false);
  });

  it("respects hasSeenDetailsTour when present", () => {
    const r = FirestoreUserSchema.safeParse({ hasSeenDetailsTour: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hasSeenDetailsTour).toBe(true);
  });

  // WorkHoursScreen Tour
  it("applies defaults for workhours tour flag", () => {
    const data = { email: "user@example.com" };
    const result = FirestoreUserSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.hasSeenWorkHoursTour).toBe(false);
  });

  it("respects hasSeenWorkHoursTour when present", () => {
    const r = FirestoreUserSchema.safeParse({ hasSeenWorkHoursTour: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hasSeenWorkHoursTour).toBe(true);
  });

  // VacationScreen Tour
  it("applies defaults for vacation tour flag", () => {
    const data = { email: "user@example.com" };
    const result = FirestoreUserSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.hasSeenVacationTour).toBe(false);
  });

  it("respects hasSeenVacationTour when present", () => {
    const r = FirestoreUserSchema.safeParse({ hasSeenVacationTour: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.hasSeenVacationTour).toBe(true);
  });

  // test TOTPUser validation
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
    };
    expect(FirestoreProjectSchema.safeParse(data).success).toBe(true);
  });
});

it("rejects project name that is too long", () => {
  const data = {
    id: "proj_4",
    name: "A".repeat(101), // 101 letters - too long
    createdAt: new Date(),
  };
  expect(FirestoreProjectSchema.safeParse(data).success).toBe(false);
});

it("accepts project name with maximum length", () => {
  const data = {
    id: "proj_5",
    name: "A".repeat(100), // 100 letters - maximum
    createdAt: new Date(),
  };
  expect(FirestoreProjectSchema.safeParse(data).success).toBe(true);
});
