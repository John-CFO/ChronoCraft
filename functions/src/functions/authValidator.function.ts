///////////////////////// authValidator.functions.ts ////////////////////////////

// This file contains the handler function for the authValidator function

/////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

import { AuthService } from "../services/authService";
import { secureFunction, InputValidator } from "./security";
import { ValidationError } from "../errors/domain.errors";
import { verifyTotpLoginHandler } from "./totp";

//////////////////////////////////////////////////////////////////////////////////

// Pure handler function
export const authValidatorHandler = async (request: CallableRequest) => {
  const { action, payload } = request.data ?? {};
  const uid = request.auth?.uid;
  const authService = new AuthService();

  InputValidator.validateRequired(request.data, "action");
  InputValidator.validateString(request.data, "action");

  if (action === "login" || action === "register") {
    return authService.loginOrRegister(action, uid);
  }

  if (action === "verifyTotpLogin") {
    if (!uid) throw new HttpsError("unauthenticated", "Not logged in");
    InputValidator.validateRequired(request.data, "payload");
    InputValidator.validateString(request.data, "payload", 6, 6);

    const result = await verifyTotpLoginHandler({
      auth: request.auth,
      data: { token: payload },
    });

    return result;
  }

  throw new ValidationError("Unknown action");
};

// Callable export (Gen-2)
export const authValidator = secureFunction(authValidatorHandler, {
  requireAuth: true, // everything except login/register/verifyTotp needs Auth
  validation: (data) => {
    if (
      !data ||
      !["login", "register", "verifyTotpLogin", "getUserProfile"].includes(
        data.action,
      )
    ) {
      throw new HttpsError("invalid-argument", "Invalid action");
    }

    if (data.action === "login" || data.action === "register") {
      if (!data.action) {
        throw new HttpsError("invalid-argument", "Missing action");
      }
    }
  },
});
