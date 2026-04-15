/////////////////////////////// requestPasswordReset.function.test.ts //////////////////////////////////

// This file contains unit tests for the requestPasswordResetHandler function

////////////////////////////////////////////////////////////////////////////////////////////////////////

import "../../../tests/unit.setup";
import { requestPasswordResetHandler } from "../../../src/functions/requestPasswordReset.function";
import { auth } from "../../../src/firebaseAdmin";
import { sendPasswordResetEmail } from "../../../src/services/emailService";

////////////////////////////////////////////////////////////////////////////////////////////////////////

// mocks
jest.mock("../../../src/firebaseAdmin", () => ({
  auth: {
    generatePasswordResetLink: jest.fn(),
  },
}));

jest.mock("../../../src/utils/rateLimitInstance", () => {
  const mockRateLimit = {
    checkLimit: jest.fn(),
    checkIP: jest.fn(),
  };

  return {
    getRateLimit: () => mockRateLimit,
    rateLimit: mockRateLimit,
  };
});

// dependencies
const { getRateLimit } = require("../../../src/utils/rateLimitInstance");
const mockRateLimit = getRateLimit();

jest.mock("../../../src/services/emailService", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

//////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("requestPasswordResetHandler (unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should run full password reset flow", async () => {
    (auth.generatePasswordResetLink as jest.Mock).mockResolvedValue(
      "https://reset.link",
    );

    const request = {
      data: { email: "test@example.com" },
      rawRequest: {
        headers: { "x-forwarded-for": "127.0.0.1" },
        socket: {},
      },
    } as any;

    const result = await requestPasswordResetHandler(request);

    expect(mockRateLimit.checkLimit).toHaveBeenCalled();
    expect(mockRateLimit.checkIP).toHaveBeenCalled();

    expect(auth.generatePasswordResetLink).toHaveBeenCalledWith(
      "test@example.com",
    );

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      "https://reset.link",
    );

    expect(result.success).toBe(true);
  });
});
