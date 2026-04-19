/////////////////////// requestPasswordReset.function.ts /////////////////////////////

// This file contains the handler function for the requestPasswordReset function

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest } from "firebase-functions/v2/https";

import { auth } from "../firebaseAdmin";
import { getRateLimit } from "../utils/rateLimitInstance";
import { InputValidator } from "./security";
import { handleFunctionError } from "../errors/handleFunctionError";
import { logEvent } from "../utils/logger";
import { sendPasswordResetEmail } from "../services/emailService";
import { buildRateLimitContext } from "../utils/rateLimitContext";

/////////////////////////////////////////////////////////////////////////////////////

export const requestPasswordResetHandler = async (request: CallableRequest) => {
  const rateLimit = getRateLimit();

  try {
    const email = request.data?.email;

    // 1. INPUT VALIDATION (deny early)
    InputValidator.validateRequired(request.data, "email");
    InputValidator.validateString(request.data, "email");

    const normalizedEmail = String(email).trim().toLowerCase();

    // 2. CONTEXT (SAFE NORMALIZATION)
    const ctx = buildRateLimitContext(request, normalizedEmail);

    // 3. GLOBAL RATE LIMIT
    await rateLimit.check(
      "password_reset",
      "auth.password_reset.global",
      {
        uid: "global",
        ip: "global",
        deviceId: "global",
      },
      {
        maxAttempts: 100,
        windowMs: 10 * 60_000,
      },
    );

    // 4. USER RATE LIMIT (EMAIL-BASED)
    await rateLimit.check(
      "password_reset",
      "auth.password_reset.user",
      {
        uid: ctx.uid,
        ip: "none",
        deviceId: "none",
      },
      {
        maxAttempts: 3,
        windowMs: 10 * 60_000,
      },
    );

    await rateLimit.check(
      "password_reset",
      "auth.password_reset.user.hour",
      {
        uid: ctx.uid,
        ip: "none",
        deviceId: "none",
      },
      {
        maxAttempts: 10,
        windowMs: 60 * 60_000,
      },
    );

    // 5. IP RATE LIMIT
    await rateLimit.check(
      "password_reset",
      "auth.password_reset.ip",
      {
        uid: "none",
        ip: ctx.ip,
        deviceId: "none",
      },
      {
        maxAttempts: 10,
        windowMs: 10 * 60_000,
      },
    );

    await rateLimit.check(
      "password_reset",
      "auth.password_reset.ip.hour",
      {
        uid: "none",
        ip: ctx.ip,
        deviceId: "none",
      },
      {
        maxAttempts: 50,
        windowMs: 60 * 60_000,
      },
    );

    // 6. LOGGING
    logEvent("PASSWORD_RESET_REQUESTED", "info", {
      ip: ctx.ip,
      email: ctx.uid,
    });

    // 7. BUSINESS LOGIC
    const link = await auth.generatePasswordResetLink(normalizedEmail);
    await sendPasswordResetEmail(normalizedEmail, link);

    return {
      success: true,
      message:
        "If an account exists for that email, you will receive instructions to reset your password.",
    };
  } catch (error) {
    logEvent("RESET_FAILED", "error", {
      message: (error as any)?.message,
    });

    throw handleFunctionError(error, "requestPasswordReset");
  }
};

export const requestPasswordReset = requestPasswordResetHandler;
