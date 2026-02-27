/////////////////////////// authService.test.ts //////////////////////////////////

// This file contains the unit tests for the AuthService.ts file.

//////////////////////////////////////////////////////////////////////////////////

// mock rateLimit first to avoid errors
jest.mock("../../../src/utils/rateLimit");
jest.mock("../../../src/utils/rateLimit");
jest.mock("../../../src/repos/userRepo");
jest.mock("../../../src/utils/logger");
jest.mock("../../../src/security/totpCore", () => ({
  verifyTotp: jest.fn(),
}));

// Minimal Mock for firebase-admin, because ratelitim imports it
jest.mock("firebase-admin", () => ({
  firestore: jest.fn(),
  initializeApp: jest.fn(),
  apps: [],
}));

import { AuthService } from "../../../src/services/authService";
import { UserRepo } from "../../../src/repos/userRepo";
import { rateLimit } from "../../../src/utils/rateLimit";
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

    // UserRepo.prototype.getUserTOTPSecret mock
    jest
      .spyOn(UserRepo.prototype, "getUserTOTPSecret")
      .mockResolvedValue("dummySecret");

    // verifyTotp: Only 6-digit numeric codes are valid
    mockVerifyTotp = verifyTotp as jest.MockedFunction<typeof verifyTotp>;
    mockVerifyTotp.mockImplementation((secret, code) => {
      return typeof code === "string" && /^\d{6}$/.test(code);
    });

    mockLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;

    // mock RateLimiter-Methods
    jest.spyOn(rateLimit, "checkLimit").mockResolvedValue(undefined);
    jest.spyOn(rateLimit, "checkIP").mockResolvedValue(undefined);
    jest.spyOn(rateLimit, "checkDevice").mockResolvedValue(undefined);

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

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockResolvedValueOnce(secret);
      mockVerifyTotp.mockReturnValueOnce(true);

      const spyCheckLimit = jest.spyOn(rateLimit, "checkLimit");

      const result = await authService.verifyTotp(uid, code);

      expect(spyCheckLimit).toHaveBeenCalledWith(uid, "verifyTotp", 5, 60000);
      expect(UserRepo.prototype.getUserTOTPSecret).toHaveBeenCalledWith(uid);
      expect(mockVerifyTotp).toHaveBeenCalledWith(secret, code);
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

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockResolvedValueOnce(secret);
      mockVerifyTotp.mockReturnValueOnce(false);

      const result = await authService.verifyTotp(uid, code);

      expect(rateLimit.checkLimit).toHaveBeenCalledWith(
        uid,
        "verifyTotp",
        5,
        60000,
      );
      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "warn", {
        uid,
        valid: false,
      });
      expect(result).toEqual({ valid: false });
    });

    it("should throw when TOTP not configured", async () => {
      const uid = "user123";
      const code = "123456";

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockResolvedValueOnce(null);

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        new BusinessRuleError("TOTP not configured"),
      );

      expect(rateLimit.checkLimit).toHaveBeenCalledWith(
        uid,
        "verifyTotp",
        5,
        60000,
      );
      expect(mockLogEvent).not.toHaveBeenCalledWith(
        "verifyTotp",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("should throw when rate limit exceeded", async () => {
      const uid = "user123";
      const code = "123456";

      jest
        .spyOn(rateLimit, "checkLimit")
        .mockRejectedValueOnce(new Error("Rate limit exceeded"));

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        "Rate limit exceeded",
      );

      expect(rateLimit.checkLimit).toHaveBeenCalledWith(
        uid,
        "verifyTotp",
        5,
        60000,
      );
    });

    it("should throw when user not found", async () => {
      const uid = "user123";
      const code = "123456";

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockRejectedValueOnce(new NotFoundError("User"));

      await expect(authService.verifyTotp(uid, code)).rejects.toThrow(
        new NotFoundError("User"),
      );

      expect(rateLimit.checkLimit).toHaveBeenCalledWith(
        uid,
        "verifyTotp",
        5,
        60000,
      );
    });

    it("should throw when uid is undefined", async () => {
      await expect(
        authService.verifyTotp(undefined as any, "123456"),
      ).rejects.toThrow();
    });

    it("should return valid: false for code too short", async () => {
      const uid = "user123";
      const code = "123";
      const secret = "SECRET123";

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockResolvedValueOnce(secret);

      const result = await authService.verifyTotp(uid, code);
      expect(result).toEqual({ valid: false });
      expect(mockVerifyTotp).toHaveBeenCalledWith(secret, code);
      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "warn", {
        uid,
        valid: false,
      });
    });

    it("should return valid: false for code too long", async () => {
      const uid = "user123";
      const code = "1234567";
      const secret = "SECRET123";

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockResolvedValueOnce(secret);

      const result = await authService.verifyTotp(uid, code);
      expect(result).toEqual({ valid: false });
      expect(mockVerifyTotp).toHaveBeenCalledWith(secret, code);
      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "warn", {
        uid,
        valid: false,
      });
    });

    it("should return valid: false for code not string", async () => {
      const uid = "user123";
      const code = 123456; // number
      const secret = "SECRET123";

      jest
        .spyOn(UserRepo.prototype, "getUserTOTPSecret")
        .mockResolvedValueOnce(secret);

      const result = await authService.verifyTotp(uid, code as any);
      expect(result).toEqual({ valid: false });
      expect(mockVerifyTotp).toHaveBeenCalledWith(secret, code);
      expect(mockLogEvent).toHaveBeenCalledWith("verifyTotp", "warn", {
        uid,
        valid: false,
      });
    });
  });
});
