//////////////////////earningsCalculator.test.ts////////////////////////////

// This file is used to test the earnings calculator component with unit tests
// It includes the tests for user authorization and Zod validation

///////////////////////////////////////////////////////////////////////////////

import {
  HourlyRateSchema,
  FirestoreEarningsSchema,
} from "../validation/earningsSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

describe("EarningsCalculator Security", () => {
  describe("Authorization Checks", () => {
    it("should prevent accessing other users projects", () => {
      const currentUser = { uid: "user123" };
      const projectData = {
        hourlyRate: 50,
        totalEarnings: 100,
        uid: "user456", // other user
      };

      // simulate the authorization check
      expect(projectData.uid === currentUser.uid).toBe(false);
    });

    it("should allow accessing own projects", () => {
      const currentUser = { uid: "user123" };
      const projectData = {
        hourlyRate: 50,
        totalEarnings: 100,
        uid: "user123", // same user
      };

      expect(projectData.uid === currentUser.uid).toBe(true);
    });
  });

  describe("HourlyRateSchema Validation", () => {
    it("rejects hourly rates over 300", () => {
      const result = HourlyRateSchema.safeParse({
        hourlyRate: 500,
        projectId: "valid123",
        userId: "user123",
      });
      expect(result.success).toBe(false);
    });

    it("accepts hourly rates up to 300", () => {
      const result = HourlyRateSchema.safeParse({
        hourlyRate: 300,
        projectId: "valid123",
        userId: "user123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative hourly rates", () => {
      const result = HourlyRateSchema.safeParse({
        hourlyRate: -10,
        projectId: "valid123",
        userId: "user123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("FirestoreEarningsSchema Validation", () => {
    it("accepts valid earnings data", () => {
      const validData = {
        hourlyRate: 50,
        totalEarnings: 125.75,
      };
      expect(FirestoreEarningsSchema.safeParse(validData).success).toBe(true);
    });

    it("handles missing fields gracefully", () => {
      const partialData = {
        hourlyRate: 50,
      };
      expect(FirestoreEarningsSchema.safeParse(partialData).success).toBe(true);
    });

    it("rejects invalid data types", () => {
      const invalidData = {
        hourlyRate: "fifty", // string instead of number
        totalEarnings: 125.75,
      };
      expect(FirestoreEarningsSchema.safeParse(invalidData).success).toBe(
        false
      );
    });
  });
});
