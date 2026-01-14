/////////////////////// asyncStorageSchemas.client.test.ts //////////////////////////

// This file is used to validate user data from AsyncStorage and user inputs for time tracking on the clientside

////////////////////////////////////////////////////////////////////////////////////

import {
  AsyncStorageWorkTrackerSchema,
  AsyncStorageAppStateSchema,
} from "../validation/asyncStorageSchemas";

////////////////////////////////////////////////////////////////////////////////////

describe("AsyncStorageWorkTrackerSchema (client)", () => {
  const validBase = {
    isWorking: true,
    startWorkTime: new Date().toISOString(),
    elapsedTime: 3600,
    accumulatedDuration: 7200,
    currentDocId: "doc_123",
  };

  it("accepts valid data", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("allows nullable and optional fields", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      isWorking: false,
      elapsedTime: 0,
      accumulatedDuration: 0,
      startWorkTime: null,
      currentDocId: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative elapsedTime", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      elapsedTime: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects elapsedTime above max (1 day)", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      elapsedTime: 864001,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-integer elapsedTime", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      elapsedTime: 12.5,
    });

    expect(result.success).toBe(false);
  });

  it("rejects accumulatedDuration above max (10 years)", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      accumulatedDuration: 31536001,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid ISO date string", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      startWorkTime: "not-a-date",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty document ID", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      currentDocId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects document ID longer than 500 chars", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      currentDocId: "a".repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it("rejects additional unknown fields (strict)", () => {
    const result = AsyncStorageWorkTrackerSchema.safeParse({
      ...validBase,
      injected: "evil",
    });

    expect(result.success).toBe(false);
  });
});

describe("AsyncStorageAppStateSchema (client)", () => {
  it("accepts valid minimal state", () => {
    const result = AsyncStorageAppStateSchema.safeParse({
      elapsedTime: 100,
      lastActiveTime: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = AsyncStorageAppStateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects negative elapsedTime", () => {
    const result = AsyncStorageAppStateSchema.safeParse({
      elapsedTime: -10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid date string", () => {
    const result = AsyncStorageAppStateSchema.safeParse({
      lastActiveTime: "yesterday",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict)", () => {
    const result = AsyncStorageAppStateSchema.safeParse({
      elapsedTime: 10,
      foo: "bar",
    });

    expect(result.success).toBe(false);
  });
});
