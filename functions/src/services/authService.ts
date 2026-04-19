/////////////////////////////// authService.ts //////////////////////////////////

// This file contains the implementation of the AuthService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { rateLimit } from "../utils/rateLimitInstance";
import { verifyTotp } from "../security/totpCore";
import { logEvent } from "../utils/logger";
import { BusinessRuleError, ValidationError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////

export class AuthService {
  private userRepo = new UserRepo();

  async loginOrRegister(action: "login" | "register", uid?: string) {
    if (!["login", "register"].includes(action)) {
      throw new ValidationError("Invalid action for loginOrRegister");
    }
    logEvent(`auth ${action}`, "info", { uid });
    return { success: true };
  }

  async verifyTotp(uid: string, code: string) {
    if (!uid) {
      throw new ValidationError("UID is required");
    }

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      throw new ValidationError("Invalid TOTP code");
    }

    // --- RATE LIMIT (new unified API) ---
    await rateLimit.check(
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

    const secret = await this.userRepo.getUserTOTPSecret(uid);
    if (!secret) {
      throw new BusinessRuleError(
        "TOTP not configured",
        "Please configure your TOTP.",
      );
    }

    const { valid } = verifyTotp(secret, code);
    logEvent("verifyTotp", valid ? "info" : "warn", { uid, valid });

    return { valid };
  }
}
