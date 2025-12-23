////////////////timeTrackingStateSchemas.sec.test.ts////////////////////////////

// This file is used to test the timeTrackingStateSchemas with unit tests

///////////////////////////////////////////////////////////////////////////////

import { jest } from "@jest/globals";
import {
  validateSetProjectData,
  validateTimerAndEarnings,
  isValidProjectId,
  ProjectStateSchema,
  TimerAndEarningsSchema,
  SetProjectDataSchema,
} from "../validation/timeTrackingStateSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

describe("TimeTrackingState Schemas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Project ID Validation", () => {
    it("accepts valid Firestore document IDs", () => {
      const validIds = [
        "proj-123",
        "project_abc",
        "test-1",
        "myProject",
        "user_123_project_456",
      ];

      validIds.forEach((id) => {
        expect(isValidProjectId(id)).toBe(true);
      });
    });

    it("rejects empty and too long project IDs", () => {
      expect(isValidProjectId("")).toBe(false);
      expect(isValidProjectId("a".repeat(101))).toBe(false);
      expect(isValidProjectId(null as any)).toBe(false);
      expect(isValidProjectId(undefined as any)).toBe(false);
      expect(isValidProjectId(123 as any)).toBe(false);
    });

    it("rejects Firestore reserved characters", () => {
      const invalidIds = [
        "proj.123", // Dot
        "proj$123", // Dollar
        "proj[123", // Open Bracket
        "proj]123", // Close Bracket
        "proj/123", // Slash
        "proj#123", // Hash
      ];

      invalidIds.forEach((id) => {
        expect(isValidProjectId(id)).toBe(false);
      });
    });

    it("rejects numeric-only IDs", () => {
      expect(isValidProjectId("123")).toBe(false);
      expect(isValidProjectId("007")).toBe(false);
    });
  });

  describe("ProjectStateSchema Validation", () => {
    it("validates complete project state with realistic values", () => {
      const validState = {
        uid: "test-user-123",
        id: "proj-1",
        timer: 3600,
        isTracking: true,
        startTime: new Date(),
        hourlyRate: 25,
        elapsedTime: 3600,
        totalEarnings: 25.5,
        maxWorkHours: 8,
      };

      expect(() => ProjectStateSchema.parse(validState)).not.toThrow();
    });

    it("applies default values for missing fields", () => {
      const minimalState = {
        uid: "test-user-123",
        id: "proj-1",
      };

      const result = ProjectStateSchema.parse(minimalState);
      expect(result.timer).toBe(0);
      expect(result.isTracking).toBe(false);
      expect(result.hourlyRate).toBe(0);
      expect(result.totalEarnings).toBe(0);
      expect(result.elapsedTime).toBe(0);
      expect(result.maxWorkHours).toBe(0);
    });

    it("rejects negative numeric values", () => {
      const invalidState = {
        uid: "test-user-123",
        id: "proj-1",
        timer: -100,
        totalEarnings: -50,
        hourlyRate: -10,
        elapsedTime: -1,
        maxWorkHours: -5,
      };

      expect(() => ProjectStateSchema.parse(invalidState)).toThrow();
    });

    it("rejects values exceeding realistic maximums", () => {
      const exceedingState = {
        uid: "test-user-123",
        id: "proj-1",
        timer: 315360001, // over 10 Years
        hourlyRate: 10001, // over 10.000$/h
        totalEarnings: 10000001, // over 10 Million
        maxWorkHours: 8761, // over 1 Year of work
      };

      expect(() => ProjectStateSchema.parse(exceedingState)).toThrow();
    });
  });

  describe("SetProjectDataSchema Validation", () => {
    it("validates setProjectData with partial project data", () => {
      const validData = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: 7200,
          isTracking: false,
          hourlyRate: 30,
        },
      };

      expect(() => SetProjectDataSchema.parse(validData)).not.toThrow();
    });

    it("rejects invalid projectId in setProjectData", () => {
      const invalidData = {
        uid: "test-user-123",
        projectId: "proj.123", // invalid ID
        projectData: { timer: 3600 },
      };

      expect(() => SetProjectDataSchema.parse(invalidData)).toThrow();
    });

    it("rejects invalid data types in projectData", () => {
      const invalidTypes = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: "7200" as any, // String instead of Number
          isTracking: "yes" as any, // String instead of Boolean
          hourlyRate: [] as any, // Array instead of Number
        },
      };

      expect(() => SetProjectDataSchema.parse(invalidTypes)).toThrow();
    });
  });

  describe("TimerAndEarningsSchema Validation", () => {
    it("validates correct timer and earnings data", () => {
      const validData = {
        uid: "test-user-123",
        projectId: "proj-1",
        timer: 7200,
        totalEarnings: 50.0,
      };

      expect(() => TimerAndEarningsSchema.parse(validData)).not.toThrow();
    });

    it("rejects negative timer and earnings", () => {
      const negativeData = {
        uid: "test-user-123",
        projectId: "proj-1",
        timer: -100,
        totalEarnings: -50,
      };

      expect(() => TimerAndEarningsSchema.parse(negativeData)).toThrow();
    });

    it("rejects invalid projectId", () => {
      const invalidProjectId = {
        uid: "test-user-123",
        projectId: "", // empty ID
        timer: 100,
        totalEarnings: 10,
      };

      expect(() => TimerAndEarningsSchema.parse(invalidProjectId)).toThrow();
    });

    it("rejects values exceeding maximum limits", () => {
      const exceedingData = {
        uid: "test-user-123",
        projectId: "proj-1",
        timer: 315360001, // over Maximum
        totalEarnings: 10000001, // over Maximum
      };

      expect(() => TimerAndEarningsSchema.parse(exceedingData)).toThrow();
    });
  });

  describe("Real-World Scenario Validation", () => {
    it("handles typical work day scenario", () => {
      const workDayData = {
        uid: "test-user-123",
        projectId: "client-project-123",
        projectData: {
          timer: 28800, // 8 Hours
          hourlyRate: 65,
          totalEarnings: 520,
          isTracking: false,
          startTime: new Date("2024-01-01T09:00:00"),
          endTime: new Date("2024-01-01T17:00:00"),
        },
      };

      expect(() => SetProjectDataSchema.parse(workDayData)).not.toThrow();
    });

    it("handles paused timer state", () => {
      const pausedData = {
        uid: "test-user-123",
        projectId: "proj-456",
        projectData: {
          timer: 7200, // 2 Hours
          isTracking: false,
          pauseTime: new Date(),
          hourlyRate: 40,
          totalEarnings: 80,
        },
      };

      expect(() => SetProjectDataSchema.parse(pausedData)).not.toThrow();
    });

    it("handles reset scenario with zero values", () => {
      const resetData = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: 0,
          totalEarnings: 0,
          hourlyRate: 0,
          isTracking: false,
          startTime: null,
          endTime: null,
        },
      };

      expect(() => SetProjectDataSchema.parse(resetData)).not.toThrow();
    });
  });

  describe("Validation Functions Integration", () => {
    it("validateSetProjectData works with valid data", () => {
      const validData = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: { timer: 3600, hourlyRate: 25 },
      };

      expect(() => validateSetProjectData(validData)).not.toThrow();
    });

    it("validateSetProjectData throws with invalid data", () => {
      const invalidData = {
        uid: "test-user-123",
        projectId: "proj.1", // invalid ID
        projectData: { timer: -100 },
      };

      expect(() => validateSetProjectData(invalidData)).toThrow();
    });

    it("validateTimerAndEarnings works with valid data", () => {
      const validData = {
        uid: "test-user-123",
        projectId: "proj-1",
        timer: 1800,
        totalEarnings: 12.5,
      };

      expect(() => validateTimerAndEarnings(validData)).not.toThrow();
    });

    it("validateTimerAndEarnings throws with invalid data", () => {
      const invalidData = {
        uid: "test-user-123",
        projectId: "", // invalid ID
        timer: -50,
        totalEarnings: -10,
      };

      expect(() => validateTimerAndEarnings(invalidData)).toThrow();
    });
  });

  describe("Edge Cases and Boundary Values", () => {
    it("accepts maximum allowed values", () => {
      const maxValues = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: 315360000, // Max alowed (~10 Years)
          hourlyRate: 10000, // Max alowed
          totalEarnings: 10000000, // Max alowed
          maxWorkHours: 8760, // Max alowed
        },
      };

      expect(() => SetProjectDataSchema.parse(maxValues)).not.toThrow();
    });

    it("rejects just above maximum values", () => {
      const aboveMaxValues = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: 315360001, // 1 Hours over Maximum
          hourlyRate: 10001, // 1$ over Maximum
          totalEarnings: 10000001, // 1$ over Maximum
        },
      };

      expect(() => SetProjectDataSchema.parse(aboveMaxValues)).toThrow();
    });

    it("handles zero values correctly", () => {
      const zeroValues = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: 0,
          totalEarnings: 0,
          hourlyRate: 0,
          elapsedTime: 0,
          maxWorkHours: 0,
        },
      };

      expect(() => SetProjectDataSchema.parse(zeroValues)).not.toThrow();
    });

    it("rejects NaN and Infinity values", () => {
      const invalidNumbers = {
        uid: "test-user-123",
        projectId: "proj-1",
        projectData: {
          timer: NaN,
          totalEarnings: Infinity,
          hourlyRate: -Infinity,
        },
      };

      expect(() => SetProjectDataSchema.parse(invalidNumbers)).toThrow();
    });
  });
});
