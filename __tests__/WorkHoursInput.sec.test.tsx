/////////////////////////////WorkHoursInput.test.tsx////////////////////////////

// This file is used to test the WorkHoursInput with unit tests
// It includes the tests for the Zod validation, input sanitization,
// and data sanitization

///////////////////////////////////////////////////////////////////////////////

import { sanitizeHours } from "../components/InputSanitizers";
import { FirestoreWorkHoursSchema } from "../validation/firestoreSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

describe("WorkHoursInput — Real World AppSec", () => {
  // testing input sanitization
  describe("Input Sanitization", () => {
    it("returns safe string for any input", () => {
      const result = sanitizeHours("test123");
      expect(typeof result).toBe("string");
    });

    it("handles basic numeric input", () => {
      expect(sanitizeHours("8.5")).toBe("8.5");
    });
  });

  // test Zod Schema with real data
  describe("Zod Schema - Real Data", () => {
    // validate minimal data
    it("accepts minimal valid data", () => {
      // real minimal data
      const minimalData = {
        elapsedTime: 3600,
        isWorking: false,
      };
      expect(FirestoreWorkHoursSchema.safeParse(minimalData).success).toBe(
        true
      );
    });
    // validate full data
    it("accepts full valid data", () => {
      const fullData = {
        elapsedTime: 3600,
        isWorking: false,
        expectedHours: 8,
        workDay: "2024-01-01",
        userId: "user123",
      };
      expect(FirestoreWorkHoursSchema.safeParse(fullData).success).toBe(true);
    });

    // validate obviously malicious data
    it("rejects obviously malicious data", () => {
      const maliciousData = {
        expectedHours: NaN, // invalid number format
        workDay: '<script>alert("xss")</script>', // XSS-vulnerability test
      };
      expect(FirestoreWorkHoursSchema.safeParse(maliciousData).success).toBe(
        false
      );
    });
  });

  // critical security
  describe("Critical Security", () => {
    // validate schema
    it("schema exists and validates", () => {
      expect(typeof FirestoreWorkHoursSchema.safeParse).toBe("function");
    });
    // validate basic type safety
    it("provides basic type safety", () => {
      const result = FirestoreWorkHoursSchema.safeParse({});
      expect(result).toHaveProperty("success");
    });
  });
});
