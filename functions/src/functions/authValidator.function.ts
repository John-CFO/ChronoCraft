///////////////////////// authValidator.functions.ts ////////////////////////////

// This file contains the handler function for the authValidator function

/////////////////////////////////////////////////////////////////////////////////

import { https } from "firebase-functions/v2";

import { AuthService } from "../services/authService";
import { secureFunction, InputValidator } from "./security";
import { ValidationError } from "../errors/domain.errors";

//////////////////////////////////////////////////////////////////////////////////

// Pure handler function (no decorator dependencies)
const authValidatorHandler = async (request: https.CallableRequest) => {
  const { action, payload } = request.data ?? {};
  const uid = request.auth?.uid;
  const authService = new AuthService();

  // Input validation
  InputValidator.validateRequired(request.data, "action");
  InputValidator.validateString(request.data, "action");

  if (action === "login" || action === "register") {
    return await authService.loginOrRegister(action, uid);
  }

  if (action === "verifyTotp") {
    if (!uid) {
      throw new https.HttpsError("unauthenticated", "Not logged in");
    }
    InputValidator.validateRequired(request.data, "payload");
    InputValidator.validateString(request.data, "payload", 6, 6); // 6-digit code

    return await authService.verifyTotp(uid, payload);
  }

  throw new ValidationError("Unknown action");
};

// Export with security wrapper
export const authValidator = secureFunction(authValidatorHandler, {
  requireAuth: false, // login/register don't require auth
  validation: (data) => {
    if (!["login", "register", "verifyTotp"].includes(data.action)) {
      throw new https.HttpsError("invalid-argument", "Invalid action");
    }
  },
  headers: {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'",
  },
});

// Separate function for authenticated TOTP verification only
const verifyTotpHandler = async (request: https.CallableRequest) => {
  const { code } = request.data ?? {};
  const uid = request.auth?.uid;

  if (!uid) {
    throw new https.HttpsError("unauthenticated", "Not logged in");
  }

  InputValidator.validateRequired(request.data, "code");
  InputValidator.validateString(request.data, "code", 6, 6);

  const authService = new AuthService();
  return await authService.verifyTotp(uid, code);
};

// Export with security wrapper
export const verifyTotp = secureFunction(verifyTotpHandler, {
  requireAuth: true,
  rateLimit: {
    action: "verifyTotp",
    maxAttempts: 5,
    windowMs: 60000,
  },
});
