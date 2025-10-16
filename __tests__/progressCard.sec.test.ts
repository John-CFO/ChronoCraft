///////////////////progressCard.sec.test.ts////////////////////////////////////////

// This file is used to test the progress card component with unit tests

///////////////////////////////////////////////////////////////////////////////

import { MaxWorkHoursSchema } from "../validation/progressSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

describe("ProgressCard Security", () => {
  describe("MaxWorkHoursSchema Validation", () => {
    it("rejects hours less than 1", () => {
      const result = MaxWorkHoursSchema.safeParse({
        maxWorkHours: 0,
        projectId: "valid123",
        userId: "user123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects hours greater than 10000", () => {
      const result = MaxWorkHoursSchema.safeParse({
        maxWorkHours: 10001,
        projectId: "valid123",
        userId: "user123",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid hours", () => {
      const result = MaxWorkHoursSchema.safeParse({
        maxWorkHours: 500,
        projectId: "valid123",
        userId: "user123",
      });
      expect(result.success).toBe(true);
    });
  });
});
