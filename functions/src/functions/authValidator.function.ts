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
const authValidatorHandler = async (request: CallableRequest) => {
  const { action, payload } = request.data ?? {};
  const uid = request.auth?.uid;
  const authService = new AuthService();

  InputValidator.validateRequired(request.data, "action");
  InputValidator.validateString(request.data, "action");

  if (action === "login" || action === "register") {
    return authService.loginOrRegister(action, uid);
  }

  if (action === "verifyTotp") {
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
  requireAuth: false,
  validation: (data) => {
    if (!data || !["login", "register", "verifyTotp"].includes(data.action)) {
      throw new HttpsError("invalid-argument", "Invalid action");
    }
  },
});

///////////////////////////////////////////////////////////////////////////////

// Separate callable for authenticated TOTP verification
const verifyTotpHandler = async (request: CallableRequest) => {
  const { code } = request.data ?? {};
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  InputValidator.validateRequired(request.data, "code");
  InputValidator.validateString(request.data, "code", 6, 6);

  const authService = new AuthService();
  return authService.verifyTotp(uid, code);
};

export const verifyTotp = secureFunction(verifyTotpHandler, {
  requireAuth: true,
  rateLimit: {
    action: "verifyTotp",
    maxAttempts: 5,
    windowMs: 60_000,
  },
});
