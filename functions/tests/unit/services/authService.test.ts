/////////////////////////// authService.test.ts //////////////////////////////////

// This files contains the unit tests for the AuthService.ts file.

//////////////////////////////////////////////////////////////////////////////////

// mock rateLimit first to avoid errors
jest.mock("../../../src/utils/rateLimit");

import { AuthService } from "../../../src/services/authService";
import { UserRepo } from "../../../src/repos/userRepo";
import { rateLimit } from "../../../src/utils/rateLimit";
import { verifyTOTP } from "../../../src/utils/totpUtils";
import { logEvent } from "../../../src/utils/logger";
import {
  NotFoundError,
  BusinessRuleError,
} from "../../../src/errors/domain.errors";

///////////////////////////////////////////////////////////////////////////////////

// mock dependencies
jest.mock("../../../src/repos/userRepo");
jest.mock("../../../src/utils/totpUtils");
jest.mock("../../../src/utils/logger");

describe("AuthService Unit Tests", () => {
  // call mock dependencies
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepo>;
  let mockRateLimit: jest.MockedFunction<typeof rateLimit>;
  let mockVerifyTOTP: jest.MockedFunction<typeof verifyTOTP>;
  let mockLogEvent: jest.MockedFunction<typeof logEvent>;

  beforeEach(() => {
    mockUserRepo = new UserRepo() as jest.Mocked<UserRepo>;
    mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
    mockVerifyTOTP = verifyTOTP as jest.MockedFunction<typeof verifyTOTP>;
    mockLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;

    authService = new AuthService();
    // @ts-ignore - access private property for testing
    authService.userRepo = mockUserRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      // @ts-ignore
      await expect(
        authService.loginOrRegister("delete" as any, "user123")
      ).rejects.toThrow("Invalid action for loginOrRegister");
    });

    it("should throw error for empty action", async () => {
      // @ts-ignore
      await expect(authService.loginOrRegister("", "user123")).rejects.toThrow(
        "Invalid action for loginOrRegister"
      );
    });
  });

  describe("verifyTotp", () => {
    it("should verify TOTP successfully", async () => {
      const uid = "user123";
      const code = "123456";
      const secret = "SECRET123";

      mockUserRepo.getUserTOTPSecret.mockResolvedValue(secret);
      mockVerifyTOTP.mockReturnValue(true);
      mockRateLimit.mockResolvedValue(undefined); // rateLimit returns Promise<void>

      const result = await authService.verifyTotp(uid, code);

      // IMPORTANT: call rateLimit directly, not .checkLimit!
      expect(mockRateLimit).toHaveBeenCalledWith(uid, "verifyTotp", 5, 60000);
      expect(mockUserRepo.getUserTOTPSecret).toHaveBeenCalledWith(uid);
      expect(mockVerifyTOTP).toHaveBeenCalledWith(secret, code);
      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "info", {
        uid,
        valid: true,
      });
      expect(result).toEqual({ valid: true });
    });

    it("should reject invalid TOTP", async () => {
      const uid = "user123";
      const code = "wrong";
      const secret = "SECRET123";

      mockUserRepo.getUserTOTPSecret.mockResolvedValue(secret);
      mockVerifyTOTP.mockReturnValue(false);
      mockRateLimit.mockResolvedValue(undefined);

      const result = await authService.verifyTotp(uid, code);

      expect(mockRateLimit).toHaveBeenCalledWith(uid, "verifyTotp", 5, 60000);
      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "warn", {
        uid,
        valid: false,
      });
      expect(result).toEqual({ valid: false });
    });

    it("should throw when TOTP not configured", async () => {
      const uid = "user123";
      const code = "123456";

      mockUserRepo.getUserTOTPSecret.mockResolvedValue(null);
      mockRateLimit.mockResolvedValue(undefined);

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        new BusinessRuleError("TOTP not configured")
      );

      expect(mockRateLimit).toHaveBeenCalledWith(uid, "verifyTotp", 5, 60000);
      expect(mockLogEvent).not.toHaveBeenCalledWith(
        "verifyTotp",
        expect.any(String),
        expect.any(Object)
      );
    });

    it("should throw when rate limit exceeded", async () => {
      const uid = "user123";
      const code = "123456";

      mockRateLimit.mockRejectedValue(new Error("Rate limit exceeded"));

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        "Rate limit exceeded"
      );

      expect(mockRateLimit).toHaveBeenCalledWith(uid, "verifyTotp", 5, 60000);
    });

    it("should throw when user not found", async () => {
      const uid = "user123";
      const code = "123456";

      mockUserRepo.getUserTOTPSecret.mockRejectedValue(
        new NotFoundError("User")
      );
      mockRateLimit.mockResolvedValue(undefined);

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        new NotFoundError("User")
      );

      expect(mockRateLimit).toHaveBeenCalledWith(uid, "verifyTotp", 5, 60000);
    });

    it("should throw when uid is undefined", async () => {
      // @ts-ignore
      await expect(
        authService.verifyTotp(undefined as any, "123456")
      ).rejects.toThrow();
    });

    it("should return valid: false for code too short", async () => {
      const uid = "user123";
      mockUserRepo.getUserTOTPSecret.mockResolvedValue("SECRET123");
      mockRateLimit.mockResolvedValue(undefined);

      const result = await authService.verifyTotp(uid, "123");
      expect(result).toEqual({ valid: false });
    });

    it("should return valid: false for code too long", async () => {
      const uid = "user123";
      mockUserRepo.getUserTOTPSecret.mockResolvedValue("SECRET123");
      mockRateLimit.mockResolvedValue(undefined);

      const result = await authService.verifyTotp(uid, "1234567");
      expect(result).toEqual({ valid: false });
    });

    it("should return valid: false for code not string", async () => {
      const uid = "user123";
      mockUserRepo.getUserTOTPSecret.mockResolvedValue("SECRET123");
      mockRateLimit.mockResolvedValue(undefined);

      // @ts-ignore
      const result = await authService.verifyTotp(uid, 123456);
      expect(result).toEqual({ valid: false });
    });
  });
});
