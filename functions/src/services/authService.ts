/////////////////////////////// authService.ts //////////////////////////////////

// This file contains the implementation of the AuthService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { rateLimit } from "../utils/rateLimitInstance";
import { verifyTotp } from "../security/totpCore";
import { logEvent } from "../utils/logger";
import { BusinessRuleError, ValidationError } from "../errors/domain.errors";
import { getTranslation } from "../services/localization/i18n";

////////////////////////////////////////////////////////////////////////////////

export class AuthService {
  private userRepo = new UserRepo();

  async loginOrRegister(
    action: "login" | "register",
    request: any,
    uid?: string,
  ) {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    if (!["login", "register"].includes(action)) {
      throw new ValidationError(t("errors.invalidAction"));
    }
    if (!uid) {
      throw new ValidationError(t("errors.uidRequired"));
    }

    if (action === "register") {
      await this.userRepo.createUserIfNotExists(uid, {
        createdVia: "auth",
      });
    }

    logEvent(`auth ${action}`, "info");

    const userDoc = await this.userRepo.getUser(uid).catch(() => null);
    const data = userDoc?.data();

    const nextStage =
      data?.totp?.enabled === true ? "pendingMfa" : "authenticated";

    return { nextStage };
  }

  async verifyTotp(request: any, uid: string, code: string) {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    if (!uid) {
      throw new ValidationError(t("errors.uidRequired"));
    }

    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      throw new ValidationError(t("errors.invalidTotpCode"));
    }

    // --- RATE LIMIT (new unified API) ---
    await rateLimit.check(
      "mfa_totp",
      "verify",
      { uid, ip: "unknown", deviceId: "unknown" },
      { maxAttempts: 5, windowMs: 60_000 },
    );

    const secret = await this.userRepo.getUserTOTPSecret(uid);

    if (!secret) {
      throw new BusinessRuleError(
        "TOTP not configured",
        t("errors.totpNotConfigured"),
      );
    }

    const { valid } = verifyTotp(secret, code);

    logEvent("verifyTotp", valid ? "info" : "warn", { valid });

    if (!valid) {
      throw new BusinessRuleError("INVALID_TOTP", t("errors.invalidTotpCode"));
    }

    return { valid };
  }
}
