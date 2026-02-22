/////////////////////////////// authService.ts //////////////////////////////////

// This file contains the implementation of the AuthService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { rateLimit } from "../utils/rateLimit";
import { verifyTotp } from "../security/totpCore";
import { logEvent } from "../utils/logger";
import { BusinessRuleError } from "../errors/domain.errors";
import { ValidationError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////

export class AuthService {
  // use UserRepo inside AuthService
  private userRepo = new UserRepo();

  // loginOrRegister method
  async loginOrRegister(action: "login" | "register", uid?: string) {
    // check if action is valid
    if (!["login", "register"].includes(action)) {
      throw new ValidationError("Invalid action for loginOrRegister");
    }
    logEvent(`auth ${action}`, "info", { uid });
    return { success: true };
  }

  // verifyTotp method
  async verifyTotp(uid: string, code: string) {
    // rate limit the request
    await rateLimit(uid, "verifyTotp", 5, 60_000);

    const secret = await this.userRepo.getUserTOTPSecret(uid);
    if (!secret) {
      throw new BusinessRuleError(
        "TOTP not configured",
        "Please configure your TOTP.",
      );
    }

    const valid = verifyTotp(secret, code);
    logEvent("verifyTotp", valid ? "info" : "warn", { uid, valid });

    return { valid };
  }
}
