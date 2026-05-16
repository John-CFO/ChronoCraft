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
    check: jest.fn(),
  };

  return {
    getRateLimit: () => mockRateLimit,
    rateLimit: mockRateLimit,
  };
});

const mockRequest = {
  rawRequest: {
    headers: {
      "x-forwarded-for": "127.0.0.1",
    },
    socket: {},
  },
};

const buildRequest = (data: { email?: string }) =>
  ({
    ...mockRequest,
    data,
  }) as any;

// dependencies
const { getRateLimit } = require("../../../src/utils/rateLimitInstance");
const { RateLimitError } = require("../../../src/errors/domain.errors");
const mockRateLimit = getRateLimit();

jest.mock("../../../src/services/emailService", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("../../../src/utils/logger", () => ({
  logEvent: jest.fn(),
}));

//////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("requestPasswordResetHandler (unit)", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    (auth.generatePasswordResetLink as jest.Mock).mockResolvedValue(undefined);

    (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

    mockRateLimit.check.mockResolvedValue(undefined);
  });

  it("should run full password reset flow", async () => {
    (auth.generatePasswordResetLink as jest.Mock).mockResolvedValue(
      "https://reset.link",
    );

    const result = await requestPasswordResetHandler(
      buildRequest({
        email: "test@example.com",
      }),
    );

    expect(mockRateLimit.check).toHaveBeenCalled();

    expect(auth.generatePasswordResetLink).toHaveBeenCalledWith(
      "test@example.com",
    );

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      "https://reset.link",
    );

    expect(result.success).toBe(true);
  });

  it("should handle email service failure", async () => {
    (auth.generatePasswordResetLink as jest.Mock).mockResolvedValue(
      "https://reset.link",
    );

    (sendPasswordResetEmail as jest.Mock).mockRejectedValue(
      new Error("email failed"),
    );

    await expect(
      requestPasswordResetHandler(
        buildRequest({
          email: "test@example.com",
        }),
      ),
    ).rejects.toThrow("Internal server error.");
  });

  it("should fail when rate limit rejects", async () => {
    mockRateLimit.check.mockRejectedValueOnce(new RateLimitError());

    await expect(
      requestPasswordResetHandler(
        buildRequest({
          email: "test@example.com",
        }),
      ),
    ).rejects.toThrow("Too many requests. Please try again later.");
  });

  it("should throw on missing email", async () => {
    await expect(requestPasswordResetHandler(buildRequest({}))).rejects.toThrow(
      "Invalid input. Please check your data.",
    );
  });
});
