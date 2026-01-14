////////////////////// progressSchemas.client.test.ts //////////////////////

// This file is used to validate user inputs for progress on the client side

////////////////////////////////////////////////////////////////////////////

import { MaxWorkHoursSchema } from "../validation/progressSchemas";

////////////////////////////////////////////////////////////////////////////

describe("MaxWorkHoursSchema (client)", () => {
  const validBase = {
    maxWorkHours: 40,
    projectId: "project_123",
    userId: "user_456",
  };

  it("accepts valid input", () => {
    const result = MaxWorkHoursSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts min boundary (1)", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      maxWorkHours: 1,
    });

    expect(result.success).toBe(true);
  });

  it("accepts max boundary (10000)", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      maxWorkHours: 10000,
    });

    expect(result.success).toBe(true);
  });

  it("rejects zero", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      maxWorkHours: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative numbers", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      maxWorkHours: -5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer values", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      maxWorkHours: 8.5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects values above max", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      maxWorkHours: 10001,
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty projectId", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      projectId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects projectId longer than 255 chars", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      projectId: "a".repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      userId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects userId longer than 255 chars", () => {
    const result = MaxWorkHoursSchema.safeParse({
      ...validBase,
      userId: "a".repeat(256),
    });

    expect(result.success).toBe(false);
  });
});
