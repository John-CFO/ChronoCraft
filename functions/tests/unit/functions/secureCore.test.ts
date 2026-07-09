////////////////////// secureCore.test.ts //////////////////////////

// This file contains the unit tests for the secureCore function

////////////////////////////////////////////////////////////////////

// mocking
jest.mock("../../../src/utils/rateLimitInstance", () => ({
  rateLimit: {
    check: jest.fn(),
  },
}));

jest.mock("../../../src/utils/logger", () => ({
  logEvent: jest.fn(),
}));

////////////////////////////////////////////////////////////////////

import { secureCore } from "../../../src/functions/secureCore";
import { RateLimitError } from "../../../src/errors/domain.errors";
import { rateLimit } from "../../../src/utils/rateLimitInstance";

////////////////////////////////////////////////////////////////////

describe("secureCore security logic", () => {
  it("should propagate RateLimitError", async () => {
    (rateLimit.check as jest.Mock).mockRejectedValue(
      new RateLimitError("Too many"),
    );

    const mockHandler = jest.fn().mockResolvedValue({ ok: true });

    await expect(
      secureCore(
        {
          auth: { uid: "user1" },
          data: {},
        },
        mockHandler,
        {
          rateLimit: {
            scope: "security",
            action: "test",
            maxAttempts: 1,
            windowMs: 1000,
          },
        },
      ),
    ).rejects.toThrow(RateLimitError);
  });
});
