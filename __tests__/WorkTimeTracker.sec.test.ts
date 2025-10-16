/////////////////////////////////WorkTimeTracker.sec.test.ts/////////////////////////////

// This file is used to test the WorkTimeTracker with unit tests
// It includes the tests for the Zod validation, input sanitization,
// and data sanitization

/////////////////////////////////////////////////////////////////////////////////////

import {
  FirestoreWorkHoursSchema,
  isValidFirestoreDocId,
} from "../validation/firestoreSchemas.sec";
import { AsyncStorageWorkTrackerSchema } from "../validation/asyncStorageSchemas.sec";

/////////////////////////////////////////////////////////////////////////////////////

describe("WorkTimeTracker - Validation", () => {
  describe("FirestoreWorkHoursSchema", () => {
    it("accepts realistic Tracking-Data", () => {
      const validData = {
        elapsedTime: 28800,
        isWorking: false,
        startWorkTime: new Date(),
        currentDocId: "2024-01-01",
        expectedHours: 8,
        overHours: 0.5,
        duration: 8.5,
        workDay: "2024-01-01",
      };
      expect(() => FirestoreWorkHoursSchema.parse(validData)).not.toThrow();
    });

    it("rejects Firesrore-reserved characters in docId", () => {
      [
        "doc.ument",
        "doc$ument",
        "doc[ument",
        "doc]ument",
        "doc/ument",
        "doc#ument",
      ].forEach((id) => {
        expect(() =>
          FirestoreWorkHoursSchema.parse({
            currentDocId: id,
            elapsedTime: 3600,
            isWorking: false,
          })
        ).toThrow();
      });
    });

    it("rejects unrealistic character values", () => {
      [
        { elapsedTime: -100 },
        { elapsedTime: 31536001 },
        { overHours: -5 },
        { duration: 8761 },
      ].forEach((data) => {
        expect(() => FirestoreWorkHoursSchema.parse(data)).toThrow();
      });
    });

    it("rejects invalid date format", () => {
      expect(() =>
        FirestoreWorkHoursSchema.parse({
          workDay: "2024-13-45",
          lastUpdatedDate: "2024/01/01",
          elapsedTime: 3600,
        })
      ).toThrow();
    });
  });

  describe("AsyncStorageWorkTrackerSchema", () => {
    it("accepts realistic Tracking-Data", () => {
      const validData = {
        isWorking: true,
        startWorkTime: new Date().toISOString(),
        elapsedTime: 3600,
        accumulatedDuration: 28800,
        currentDocId: "2024-01-01",
      };
      expect(() =>
        AsyncStorageWorkTrackerSchema.parse(validData)
      ).not.toThrow();
    });

    it("rejects invalid ISO Date Strings", () => {
      expect(() =>
        AsyncStorageWorkTrackerSchema.parse({
          isWorking: true,
          startWorkTime: "invalid-date",
          elapsedTime: 3600,
          accumulatedDuration: 7200,
        })
      ).toThrow();
    });

    it("rejects non-grant-number Time-Values", () => {
      expect(() =>
        AsyncStorageWorkTrackerSchema.parse({
          isWorking: false,
          elapsedTime: 3600.5,
          accumulatedDuration: 7200,
        })
      ).toThrow();
    });
  });

  describe("Document ID Validation", () => {
    it("accepts valid IDs", () => {
      ["2024-01-01", "user_123", "project-abc", "normal_id"].forEach((id) => {
        expect(isValidFirestoreDocId(id)).toBe(true);
      });
    });

    it("lrejects Firestore-reserved characters", () => {
      ["doc.ument", "doc$ument", "doc[ument", "doc/ument", "doc#ument"].forEach(
        (id) => {
          expect(isValidFirestoreDocId(id)).toBe(false);
        }
      );
    });
  });
});
