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

/////////////////////////////////////////////////////////////////////////////////////

export const requestPasswordResetHandler = async (request: CallableRequest) => {
  const rateLimit = getRateLimit();

  try {
    logEvent("RESET_START", "info");

    const email = request.data?.email;

    InputValidator.validateRequired(request.data, "email");
    InputValidator.validateString(request.data, "email");

    const normalizedEmail = String(email).trim().toLowerCase();

    logEvent("STEP_1_VALIDATED", "info", { normalizedEmail });

    await rateLimit.checkLimit(
      normalizedEmail,
      "auth.passwordReset",
      3,
      10 * 60_000,
    );

    const ip =
      request.rawRequest.headers["x-forwarded-for"] ||
      request.rawRequest.socket?.remoteAddress ||
      "";

    logEvent("STEP_3_IP_RESOLVED", "info", { ip });

    if (typeof ip === "string" && ip.length > 0) {
      await rateLimit.checkIP(ip, "auth.passwordReset", 10, 10 * 60_000);
      logEvent("STEP_4_IP_OK", "info");
    }

    await logEvent(`Password reset requested for ${normalizedEmail}`, "info", {
      email: normalizedEmail,
      ip,
    });

    const link = await auth.generatePasswordResetLink(normalizedEmail);

    logEvent("STEP_5_LINK_CREATED", "info", { link: !!link });

    await sendPasswordResetEmail(normalizedEmail, link);

    logEvent("STEP_6_EMAIL_SENT", "info");

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
