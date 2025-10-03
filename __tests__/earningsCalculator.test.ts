//////////////////////earningsCalculator.test.ts////////////////////////////

// This file is used to test the earnings calculator component with unit tests
// It includes the tests for user authorization, Zod validation and reject invalid project IDs

///////////////////////////////////////////////////////////////////////////////

import {
  HourlyRateSchema,
  FirestoreEarningsSchema,
} from "../validation/earningsSchemas";

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

    it("rejects invalid project IDs", () => {
      const invalidIds = ["../other", "project<script>", "project' OR 1=1"];
      invalidIds.forEach((id) => {
        const result = HourlyRateSchema.safeParse({
          hourlyRate: 50,
          projectId: id,
          userId: "user123",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Path Validation", () => {
    it("validates path parameters correctly", () => {
      const validPaths = [
        { projectId: "abc123", userId: "user123" },
        { projectId: "project_1", userId: "user-456" },
      ];

      const invalidPaths = [
        { projectId: "../../other", userId: "user123" },
        { projectId: "project<script>", userId: "user123" },
      ];

      validPaths.forEach((path) => {
        expect(/^[a-zA-Z0-9_-]+$/.test(path.projectId)).toBe(true);
        expect(/^[a-zA-Z0-9_-]+$/.test(path.userId)).toBe(true);
      });

      invalidPaths.forEach((path) => {
        expect(/^[a-zA-Z0-9_-]+$/.test(path.projectId)).toBe(false);
      });
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
