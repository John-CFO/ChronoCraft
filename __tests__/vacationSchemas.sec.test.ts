//////////////////////////////vacationSchemas.sec.test.ts////////////////////////////

// This file is used to test the vacation schemas with unit tests
// It tests the VacationInputSchema and FirestoreVacationSchema

///////////////////////////////////////////////////////////////////////////////

import {
  VacationInputSchema,
  FirestoreVacationSchema,
} from "../validation/vacationSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

describe("Vacation Schemas", () => {
  it("accepts valid vacation input", () => {
    const valid = {
      startDate: "2025-09-23",
      markedDates: {
        "2025-09-23": { selected: true },
        "2025-09-24": { selected: true, color: "blue" },
      },
    };
    const r = VacationInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects invalid date keys in markedDates", () => {
    const invalid = {
      startDate: "2025-09-23",
      markedDates: {
        "23-09-2025": { selected: true }, // wrong format
      },
    };
    expect(VacationInputSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects missing startDate", () => {
    const invalid = {
      markedDates: {
        "2025-09-23": { selected: true },
      },
    };
    expect(VacationInputSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts Firestore vacation with Timestamp-like createdAt", () => {
    // mock Firestore Timestamp object with toDate()
    const mockTimestamp = { toDate: () => new Date("2025-09-23T00:00:00Z") };
    const doc = {
      id: "abc",
      uid: "user1",
      startDate: "2025-09-23",
      markedDates: { "2025-09-23": { selected: true } },
      createdAt: mockTimestamp,
    };

    const r = FirestoreVacationSchema.safeParse(doc);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.createdAt instanceof Date).toBe(true);
    }
  });

  it("rejects Firestore vacation with invalid startDate format", () => {
    const doc = {
      id: "abc",
      uid: "user1",
      startDate: "23.09.2025",
      markedDates: { "2025-09-23": { selected: true } },
    };
    expect(FirestoreVacationSchema.safeParse(doc).success).toBe(false);
  });
});
