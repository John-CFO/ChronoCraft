///////////// timeTrackingStateSchemas.client.test.ts /////////////////

// This file is used to validate user inputs for time tracking on the client side

////////////////////////////////////////////////////////////////////////

import {
  isValidProjectId,
  ProjectStateSchema,
  TimerAndEarningsSchema,
  SetProjectDataSchema,
  StartTimerSchema,
  validateProjectState,
  validateTimerAndEarnings,
  validateStartTimer,
  isValidProjectState,
} from "../validation/timeTrackingStateSchemas";

/////////////////////////////////////////////////////////////////////

describe("isValidProjectId", () => {
  it("accepts valid projectId", () => {
    expect(isValidProjectId("project_ABC-123")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidProjectId("")).toBe(false);
  });

  it("rejects reserved firestore characters", () => {
    expect(isValidProjectId("proj/123")).toBe(false);
    expect(isValidProjectId("proj.123")).toBe(false);
    expect(isValidProjectId("proj#123")).toBe(false);
  });

  it("rejects numeric-only projectId", () => {
    expect(isValidProjectId("123456")).toBe(false);
  });

  it("rejects projectId longer than 100 chars", () => {
    expect(isValidProjectId("a".repeat(101))).toBe(false);
  });
});

describe("ProjectStateSchema", () => {
  it("accepts minimal valid state and applies defaults", () => {
    const result = ProjectStateSchema.parse({
      id: "project1",
    });

    expect(result.timer).toBe(0);
    expect(result.isTracking).toBe(false);
    expect(result.startTime).toBeNull();
    expect(result.totalEarnings).toBe(0);
  });

  it("rejects negative timer", () => {
    const result = ProjectStateSchema.safeParse({
      id: "project1",
      timer: -1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects too large earnings", () => {
    const result = ProjectStateSchema.safeParse({
      id: "project1",
      totalEarnings: 10000001,
    });

    expect(result.success).toBe(false);
  });
});

describe("TimerAndEarningsSchema", () => {
  const validBase = {
    projectId: "projectA",
    timer: 100,
    totalEarnings: 500,
    uid: "user123",
  };

  it("accepts valid input", () => {
    expect(TimerAndEarningsSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects invalid projectId", () => {
    const result = TimerAndEarningsSchema.safeParse({
      ...validBase,
      projectId: "123",
    });

    expect(result.success).toBe(false);
  });
});

describe("SetProjectDataSchema", () => {
  it("accepts valid project data", () => {
    const result = SetProjectDataSchema.safeParse({
      projectId: "projectA",
      uid: "user123",
      projectData: { id: "projectA" },
    });

    expect(result.success).toBe(true);
  });
});

describe("StartTimerSchema", () => {
  it("accepts minimal input", () => {
    const result = StartTimerSchema.safeParse({
      projectId: "projectA",
      uid: "user123",
    });

    expect(result.success).toBe(true);
  });

  it("accepts options.silent", () => {
    const result = StartTimerSchema.safeParse({
      projectId: "projectA",
      uid: "user123",
      options: { silent: true },
    });

    expect(result.success).toBe(true);
  });
});

describe("validate* functions", () => {
  it("validateProjectState throws on invalid input", () => {
    expect(() => validateProjectState({ id: "", timer: -1 })).toThrow();
  });

  it("validateTimerAndEarnings throws on invalid input", () => {
    expect(() =>
      validateTimerAndEarnings({
        projectId: "123",
        timer: -5,
        totalEarnings: 0,
        uid: "u",
      })
    ).toThrow();
  });

  it("validateStartTimer throws on invalid input", () => {
    expect(() =>
      validateStartTimer({
        projectId: "123",
        uid: "u",
      })
    ).toThrow();
  });
});

describe("isValidProjectState", () => {
  it("returns true for valid state", () => {
    expect(isValidProjectState({ id: "projectA" })).toBe(true);
  });

  it("returns false for invalid state", () => {
    expect(isValidProjectState({ id: "", timer: -1 })).toBe(false);
  });
});
