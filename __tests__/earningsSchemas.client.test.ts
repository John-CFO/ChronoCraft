///////////////////////// earningsSchemas.client.test.ts ///////////////////////

// This file is used to validate user inputs for earnings on the client side

////////////////////////////////////////////////////////////////////////////////

import { HourlyRateSchema } from "../validation/earningsSchemas";

////////////////////////////////////////////////////////////////////////////////

describe("HourlyRateSchema (client)", () => {
  const validBase = {
    hourlyRate: 50,
    projectId: "project_123",
    userId: "user_456",
  };

  it("accepts valid hourly rate input", () => {
    const result = HourlyRateSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts hourlyRate = 0 (min boundary)", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      hourlyRate: 0,
    });

    expect(result.success).toBe(true);
  });

  it("accepts hourlyRate = 300 (max boundary)", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      hourlyRate: 300,
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative hourlyRate", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      hourlyRate: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects hourlyRate above 300", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      hourlyRate: 301,
    });

    expect(result.success).toBe(false);
  });

  it("rejects NaN as hourlyRate", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      hourlyRate: NaN,
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty projectId", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      projectId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = HourlyRateSchema.safeParse({
      ...validBase,
      userId: "",
    });

    expect(result.success).toBe(false);
  });
});
