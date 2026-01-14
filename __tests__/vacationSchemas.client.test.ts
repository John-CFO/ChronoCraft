//////////////// vacationSchemas.client.test.ts /////////////////

// This file is used to validate user inputs for vacations on the client side

//////////////////////////////////////////////////////////////////

import {
  MarkedDateEntrySchema,
  MarkedDatesSchema,
  VacationInputSchema,
  FirestoreVacationSchema,
} from "../validation/vacationSchemas";

////////////////////////////////////////////////////////////////

describe("MarkedDateEntrySchema", () => {
  it("accepts valid entry", () => {
    const result = MarkedDateEntrySchema.safeParse({
      selected: true,
      color: "#FFAA00",
      textColor: "000",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid color", () => {
    const result = MarkedDateEntrySchema.safeParse({
      color: "red",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    const result = MarkedDateEntrySchema.safeParse({
      selected: true,
      injected: "evil",
    });

    expect(result.success).toBe(false);
  });
});

describe("MarkedDatesSchema", () => {
  it("accepts valid date map", () => {
    const result = MarkedDatesSchema.safeParse({
      "2026-01-01": { selected: true },
      "2026-01-02": { color: "#fff" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid date key", () => {
    const result = MarkedDatesSchema.safeParse({
      "01-01-2026": { selected: true },
    });

    expect(result.success).toBe(false);
  });
});

describe("VacationInputSchema", () => {
  it("accepts valid vacation input", () => {
    const result = VacationInputSchema.safeParse({
      uid: "user123",
      startDate: "2026-01-01",
      markedDates: {
        "2026-01-01": { selected: true },
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid startDate", () => {
    const result = VacationInputSchema.safeParse({
      uid: "user123",
      startDate: "01.01.2026",
      markedDates: {},
    });

    expect(result.success).toBe(false);
  });
});

describe("FirestoreVacationSchema", () => {
  const base = {
    uid: "user123",
    startDate: "2026-01-01",
    markedDates: {},
  };

  it("accepts Date instance for createdAt", () => {
    const result = FirestoreVacationSchema.safeParse({
      ...base,
      createdAt: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it("accepts timestamp number for createdAt", () => {
    const result = FirestoreVacationSchema.safeParse({
      ...base,
      createdAt: Date.now(),
    });

    expect(result.success).toBe(true);
  });

  it("accepts Firestore-like toDate() object", () => {
    const result = FirestoreVacationSchema.safeParse({
      ...base,
      createdAt: {
        toDate: () => new Date(),
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid createdAt value", () => {
    const result = FirestoreVacationSchema.safeParse({
      ...base,
      createdAt: "yesterday",
    });

    expect(result.success).toBe(false);
  });
});
