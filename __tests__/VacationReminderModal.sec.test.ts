////////////////////////////////vacationReminderModal.test.ts////////////////////////////

// This file tests the VacationReminderModal with unit tests
// It includes the tests for the Zod validation, is there a pushToken and has the correct type,
// startDate -Format and createdAt (Timestamp-like -> Date)

/////////////////////////////////////////////////////////////////////////////////////////

import { z } from "zod";

import {
  FirestoreVacationSchema,
  VacationInputSchema,
} from "../validation/vacationSchemas.sec";

////////////////////////////////////////////////////////////////////////////////////////

// Minimal schema for user push-token validation used by the reminder flow
const UserPushSchema = z.object({
  pushToken: z.string().min(1),
});

describe("VacationRemindModal - Zod validation (AppSec relevant)", () => {
  // User / push token validation
  it("accepts user doc with pushToken (string)", () => {
    const r = UserPushSchema.safeParse({ pushToken: "ExponentPushToken[abc]" });
    expect(r.success).toBe(true);
    if (r.success) expect(typeof r.data.pushToken).toBe("string");
  });

  it("rejects user doc without pushToken", () => {
    const r = UserPushSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects user doc with non-string pushToken", () => {
    const r = UserPushSchema.safeParse({ pushToken: 12345 });
    expect(r.success).toBe(false);
  });

  // Vacation document validation
  it("accepts valid Firestore vacation doc with Timestamp-like createdAt", () => {
    const mockTimestampLike = {
      toDate: () => new Date("2025-09-23T00:00:00Z"),
    };
    const doc = {
      id: "vac1",
      uid: "user1",
      startDate: "2025-09-23",
      markedDates: { "2025-09-23": { selected: true } },
      createdAt: mockTimestampLike,
    };

    const r = FirestoreVacationSchema.safeParse(doc);
    expect(r.success).toBe(true);
    if (r.success) {
      // createdAt should be converted to Date by the preprocess in the schema
      expect(r.data.createdAt instanceof Date).toBe(true);
      expect(r.data.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("rejects Firestore vacation doc with invalid startDate format", () => {
    const doc = {
      id: "vac2",
      uid: "user1",
      startDate: "23.09.2025", // invalid format
      markedDates: { "2025-09-23": { selected: true } },
    };
    const r = FirestoreVacationSchema.safeParse(doc);
    expect(r.success).toBe(false);
  });

  it("accepts Firestore vacation doc with reminderDuration (number)", () => {
    const doc = {
      id: "vac3",
      uid: "user1",
      startDate: "2025-10-01",
      markedDates: { "2025-10-01": { selected: true } },
      reminderDuration: 3,
    };
    const r = FirestoreVacationSchema.safeParse(doc);
    expect(r.success).toBe(true);
    if (r.success) expect(typeof r.data.reminderDuration).toBe("number");
  });

  it("rejects Firestore vacation doc when reminderDuration has wrong type", () => {
    const doc = {
      id: "vac4",
      uid: "user1",
      startDate: "2025-10-01",
      markedDates: { "2025-10-01": { selected: true } },
      // wrong type:
      reminderDuration: "three",
    };
    const r = FirestoreVacationSchema.safeParse(doc);
    expect(r.success).toBe(false);
  });

  // VacationForm input (frontend -> validated before addDoc)
  it("accepts valid VacationForm input (startDate + markedDates)", () => {
    const input = {
      startDate: "2025-09-23",
      markedDates: {
        "2025-09-23": { selected: true },
        "2025-09-24": { selected: true, color: "blue" },
      },
    };
    const r = VacationInputSchema.safeParse(input);
    expect(r.success).toBe(true);
  });

  it("rejects VacationForm input with invalid date keys", () => {
    const input = {
      startDate: "2025-09-23",
      markedDates: {
        // wrong key format
        "23-09-2025": { selected: true },
      },
    };
    const r = VacationInputSchema.safeParse(input);
    expect(r.success).toBe(false);
  });
});
