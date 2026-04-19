/////////////////////////// authService.test.ts //////////////////////////////////

// This file contains the unit tests for the AuthService.ts file.

//////////////////////////////////////////////////////////////////////////////////

jest.mock("../../../src/utils/rateLimitInstance");
jest.mock("../../../src/repos/userRepo");
jest.mock("../../../src/utils/logger");
jest.mock("../../../src/security/totpCore", () => ({
  verifyTotp: jest.fn(),
}));

jest.mock("firebase-admin", () => ({
  firestore: jest.fn(),
  initializeApp: jest.fn(),
  apps: [],
}));

import { AuthService } from "../../../src/services/authService";
import { UserRepo } from "../../../src/repos/userRepo";
import { rateLimit } from "../../../src/utils/rateLimitInstance";
import { verifyTotp } from "../../../src/security/totpCore";
import { logEvent } from "../../../src/utils/logger";
import {
  NotFoundError,
  BusinessRuleError,
} from "../../../src/errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////////

describe("AuthService Unit Tests", () => {
  let authService: AuthService;
  let mockVerifyTotp: jest.MockedFunction<typeof verifyTotp>;
  let mockLogEvent: jest.MockedFunction<typeof logEvent>;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(UserRepo.prototype, "getUserTOTPSecret");

    mockVerifyTotp = verifyTotp as jest.MockedFunction<typeof verifyTotp>;
    mockVerifyTotp.mockImplementation((secret, code) => {
      return {
        valid: typeof code === "string" && /^\d{6}$/.test(code),
      };
    });

    mockLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;

    jest.spyOn(rateLimit, "check").mockResolvedValue(undefined);

    authService = new AuthService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("loginOrRegister", () => {
    it("should log event and return success for login", async () => {
      const result = await authService.loginOrRegister("login", "user123");
      expect(mockLogEvent).toHaveBeenCalledWith("auth login", "info", {
        uid: "user123",
      });
      expect(result).toEqual({ success: true });
    });

    it("should log event and return success for register", async () => {
      const result = await authService.loginOrRegister("register", "user123");
      expect(mockLogEvent).toHaveBeenCalledWith("auth register", "info", {
        uid: "user123",
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle undefined uid", async () => {
      const result = await authService.loginOrRegister("login", undefined);
      expect(mockLogEvent).toHaveBeenCalledWith("auth login", "info", {
        uid: undefined,
      });
      expect(result).toEqual({ success: true });
    });

    it("should throw error for unknown action", async () => {
      await expect(
        authService.loginOrRegister(
          "delete" as "login" | "register",
          "user123",
        ),
      ).rejects.toThrow("Invalid action for loginOrRegister");
    });

    it("should throw error for empty action", async () => {
      await expect(
        authService.loginOrRegister("" as "login" | "register", "user123"),
      ).rejects.toThrow("Invalid action for loginOrRegister");
    });
  });

  describe("verifyTotp", () => {
    it("should verify TOTP successfully", async () => {
      const uid = "user123";
      const code = "123456";
      const secret = "SECRET123";

      (UserRepo.prototype.getUserTOTPSecret as jest.Mock).mockResolvedValueOnce(
        secret,
      );

      mockVerifyTotp.mockReturnValueOnce({ valid: true });

      const spyCheck = jest.spyOn(rateLimit, "check");

      const result = await authService.verifyTotp(uid, code);

      expect(spyCheck).toHaveBeenCalledWith(
        "mfa_totp",
        "verify",
        {
          uid,
          ip: "unknown",
          deviceId: "unknown",
        },
        {
          maxAttempts: 5,
          windowMs: 60_000,
        },
      );

      expect(UserRepo.prototype.getUserTOTPSecret).toHaveBeenCalledWith(uid);
      expect(mockVerifyTotp).toHaveBeenCalledWith(secret, code);

      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "info", {
        uid,
        valid: true,
      });

      expect(result).toEqual({ valid: true });
    });

    it("should throw on invalid TOTP format", async () => {
      const uid = "user123";

      await expect(authService.verifyTotp(uid, "wrong")).rejects.toThrow(
        "Invalid TOTP code",
      );

      expect(rateLimit.check).not.toHaveBeenCalled();
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    it("should throw when TOTP not configured", async () => {
      const uid = "user123";
      const code = "123456";

      (UserRepo.prototype.getUserTOTPSecret as jest.Mock).mockResolvedValueOnce(
        null,
      );

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        new BusinessRuleError("TOTP not configured"),
      );

      expect(rateLimit.check).toHaveBeenCalled();
    });

    it("should throw when rate limit exceeded", async () => {
      const uid = "user123";
      const code = "123456";

      jest
        .spyOn(rateLimit, "check")
        .mockRejectedValueOnce(new Error("Rate limit exceeded"));

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        "Rate limit exceeded",
      );
    });

    it("should throw when user not found", async () => {
      const uid = "user123";
      const code = "123456";

      (UserRepo.prototype.getUserTOTPSecret as jest.Mock).mockRejectedValueOnce(
        new NotFoundError("User"),
      );

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        new NotFoundError("User"),
      );

      expect(rateLimit.check).toHaveBeenCalled();
    });

    it("should throw when uid is undefined", async () => {
      await expect(
        authService.verifyTotp(undefined as any, "123456"),
      ).rejects.toThrow();
    });

    it("should return valid: false for invalid formats", async () => {
      const uid = "user123";

      const cases = ["123", "1234567", 123456 as any];

      for (const code of cases) {
        await expect(authService.verifyTotp(uid, code as any)).rejects.toThrow(
          "Invalid TOTP code",
        );
      }
    });
  });
});
