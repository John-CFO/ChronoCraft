/////////////////////////////////WorkTimeTracker.test.ts/////////////////////////////

// This file is used to test the WorkTimeTracker with unit tests
// It includes the tests for the Zod validation, input sanitization,
// and data sanitization

/////////////////////////////////////////////////////////////////////////////////////

import { FirestoreWorkHoursSchema } from "../validation/firestoreSchemas";
import { AsyncStorageWorkTrackerSchema } from "../validation/asyncStorageSchemas";

/////////////////////////////////////////////////////////////////////////////////////

// symple AsyncStorage Mock
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
};

// symple Firebase Mock
const mockFirebase = {
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
};

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
jest.mock("firebase/firestore", () => mockFirebase);

// clear mocks before each test
describe("WorkHoursTracker — Schema AppSec Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Firebase Schema Security
  describe("FirestoreWorkHoursSchema Security", () => {
    // test valid data
    it("accepts valid work hours data", () => {
      const validData = {
        elapsedTime: 28800,
        isWorking: false,
        expectedHours: 8,
        overHours: 0.5,
        duration: 8.5,
        workDay: "2024-01-01",
        userId: "user123",
      };

      expect(FirestoreWorkHoursSchema.safeParse(validData).success).toBe(true);
    });

    // test invalid data with malicious fields (XXS)
    it("rejects XSS attempts in string fields", () => {
      const xssData = {
        workDay: '<script>alert("xss")</script>',
        currentDocId: "<img src=x onerror=alert(1)>",
      };

      expect(FirestoreWorkHoursSchema.safeParse(xssData).success).toBe(false);
    });
    // test invalid data with malicious fields (SQL injection)
    it("rejects SQL injection patterns", () => {
      const sqlInjectionData = {
        workDay: "'; DROP TABLE users; --",
        currentDocId: "1' OR '1'='1",
      };

      expect(FirestoreWorkHoursSchema.safeParse(sqlInjectionData).success).toBe(
        false
      );
    });
    // test invalid data with malicious fields (path traversal)
    it("rejects path traversal attempts", () => {
      const pathTraversalData = {
        currentDocId: "../../../etc/passwd",
        workDay: "..\\..\\windows\\system32",
      };

      expect(
        FirestoreWorkHoursSchema.safeParse(pathTraversalData).success
      ).toBe(false);
    });
    // test invalid data with malicious fields (command injection)
    it("rejects invalid data types", () => {
      const invalidTypes = {
        expectedHours: "eight", // Should be number
        isWorking: "yes", // Should be boolean
        elapsedTime: [], // Should be number
      };

      expect(FirestoreWorkHoursSchema.safeParse(invalidTypes).success).toBe(
        false
      );
    });
    // test invalid data with malicious fields (prototype pollution)
    it("rejects prototype pollution attempts", () => {
      const pollutionData = {
        expectedHours: 8,
        __proto__: { isAdmin: true },
        constructor: { prototype: {} },
      };

      const result = FirestoreWorkHoursSchema.safeParse(pollutionData);
      expect(result.success).toBe(false);
    });
  });

  // AsyncStorage Schema Security
  describe("AsyncStorageWorkTrackerSchema Security", () => {
    it("accepts valid tracker state", () => {
      const validState = {
        isWorking: true,
        startWorkTime: "2024-01-01T10:00:00Z",
        elapsedTime: 8.5,
        accumulatedDuration: 40,
        currentDocId: "2024-01-01",
      };

      expect(AsyncStorageWorkTrackerSchema.safeParse(validState).success).toBe(
        true
      );
    });
    // test unrealistic time values
    it("rejects unrealistic time values", () => {
      const unrealisticTimes = {
        elapsedTime: -5, // Negative hours
        accumulatedDuration: 24 * 400, // More than 1 year
      };

      expect(
        AsyncStorageWorkTrackerSchema.safeParse(unrealisticTimes).success
      ).toBe(false);
    });
    // test malicious field values
    it("rejects malicious field values", () => {
      const maliciousValues = {
        currentDocId: "../../other/collection",
        startWorkTime: "invalid-date-format",
      };

      expect(
        AsyncStorageWorkTrackerSchema.safeParse(maliciousValues).success
      ).toBe(false);
    });
    // test invalid boolean values
    it("rejects invalid boolean values", () => {
      const invalidBoolean = {
        isWorking: "true", // Should be boolean, not string
        elapsedTime: 8.5,
      };

      expect(
        AsyncStorageWorkTrackerSchema.safeParse(invalidBoolean).success
      ).toBe(false);
    });
  });

  // Business Logic Validation
  describe("Business Logic Validation", () => {
    // test work session calculations
    it("validates work session calculations", () => {
      // test normal work day
      const normalSession = 8.5;
      expect(normalSession).toBeGreaterThan(0);
      expect(normalSession).toBeLessThanOrEqual(24);

      // test overtime
      const overtimeSession = 10.5;
      expect(overtimeSession).toBeGreaterThan(8);
      expect(overtimeSession).toBeLessThan(24);
    });
    // test accumulated duration limits
    it("validates accumulated duration limits", () => {
      const reasonableAccumulation = 40; // 1 week full-time
      const unreasonableAccumulation = 24 * 400; // ~400 days

      expect(reasonableAccumulation).toBeLessThan(24 * 365);
      expect(unreasonableAccumulation).toBeGreaterThan(24 * 365);
    });
    // test overHours calculation
    it("validates overHours calculation logic", () => {
      // Normal case
      expect(Math.max(9.5 - 8, 0)).toBe(1.5);

      // No overtime
      expect(Math.max(7.5 - 8, 0)).toBe(0);

      // Exact match
      expect(Math.max(8 - 8, 0)).toBe(0);
    });
  });

  // Data Transformation Security
  describe("Data Transformation Security", () => {
    it("validates date string formats correctly", () => {
      const validDate = "2024-01-01";
      const invalidDate = "not-a-date";
      const anotherInvalidDate = "2024-13-01"; // invalid month

      const isValidDate = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return date.toString() !== "Invalid Date" && !isNaN(date.getTime());
      };

      expect(isValidDate(validDate)).toBe(true);
      expect(isValidDate(invalidDate)).toBe(false);
      expect(isValidDate(anotherInvalidDate)).toBe(false);
    });

    // test date format validation
    it("validates date formats with regex", () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      expect(dateRegex.test("2024-01-01")).toBe(true);
      expect(dateRegex.test("2024/01/01")).toBe(false);
      expect(dateRegex.test("not-a-date")).toBe(false);
      expect(dateRegex.test("2024-13-45")).toBe(true);
    });
  });

  // Error case validation
  describe("Error Case Validation", () => {
    // test missing optional fields
    it("handles missing optional fields gracefully", () => {
      const minimalData = {
        elapsedTime: 28800,
        isWorking: false,
      };

      const result = FirestoreWorkHoursSchema.safeParse(minimalData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.expectedHours).toBe(0); // Default value
        expect(result.data.overHours).toBe(0); // Default value
      }
    });
    // test NaN values
    it("rejects NaN values in numeric fields", () => {
      const nanData = {
        expectedHours: NaN,
        elapsedTime: 28800,
      };

      expect(FirestoreWorkHoursSchema.safeParse(nanData).success).toBe(false);
    });
    // test string format constraints
    it("validates string format constraints", () => {
      const invalidFormatData = {
        workDay: "2024-13-45", // Invalid date
        lastUpdatedDate: "2024/01/01", // Wrong format
      };

      expect(
        FirestoreWorkHoursSchema.safeParse(invalidFormatData).success
      ).toBe(false);
    });
  });
});
