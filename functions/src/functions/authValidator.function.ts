///////////////////////// authValidator.functions.ts ////////////////////////////

// This file contains the handler function for the authValidator function

/////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

import { AuthService } from "../services/authService";
import { secureFunction, InputValidator } from "./security";
import { ValidationError } from "../errors/domain.errors";
import { verifyTotpLoginHandler } from "./totp";
import { getTranslation } from "../services/localization/i18n";

//////////////////////////////////////////////////////////////////////////////////

// Pure handler function
export const authValidatorHandler = async (request: CallableRequest) => {
  // use getTranslation to get the current language
  const t = await getTranslation(request.data?.language);

  const { action, payload } = request.data ?? {};
  const uid = request.auth?.uid;
  const authService = new AuthService();

  InputValidator.validateRequired(request.data, "action");
  InputValidator.validateString(request.data, "action");

  if (action === "login" || action === "register") {
    return authService.loginOrRegister(action, uid);
  }

  if (action === "verifyTotpLogin") {
    if (!uid) throw new HttpsError("unauthenticated", t("errors.notLoggedIn"));
    InputValidator.validateRequired(request.data, "payload");
    InputValidator.validateString(request.data, "payload", 6, 6);

    const result = await verifyTotpLoginHandler({
      auth: request.auth,
      data: { token: payload },
    });

    return result;
  }

  throw new ValidationError(t("errors.unknownAction"));
};

// Callable export (Gen-2)
export const authValidator = secureFunction(authValidatorHandler, {
  requireAuth: true, // everything except login/register/verifyTotp needs Auth
  validation: async (data: unknown) => {
    // use getTranslation to get the current language
    const t = await getTranslation(
      typeof data === "object" && data !== null && "language" in data
        ? (data as { language?: string }).language
        : undefined,
    );

    if (!data || typeof data !== "object") {
      throw new HttpsError("invalid-argument", t("errors.invalidAction"));
    }

    const d = data as { action?: string };

    if (
      !d.action ||
      !["login", "register", "verifyTotpLogin", "getUserProfile"].includes(
        d.action,
      )
    ) {
      throw new HttpsError("invalid-argument", t("errors.invalidAction"));
    }
  },
});
