/////////////////////////// secureCore.ts //////////////////////////////////

// This file contains the security core for the secureFunction wrapper in securty.ts

///////////////////////////////////////////////////////////////////////////////

import { InputValidator } from "./security";
import { AuthenticationError, RateLimitError } from "../errors/domain.errors";
import { rateLimit } from "../utils/rateLimitInstance";
import { logEvent } from "../utils/logger";
import type { UseCase } from "../utils/rateLimit";

///////////////////////////////////////////////////////////////////////////////

type CallableRequest = {
  auth?: { uid?: string };
  data?: any;
};

///////////////////////////////////////////////////////////////////////////////

export async function secureCore(
  request: CallableRequest,
  handler: (req: CallableRequest) => Promise<any>,
  options?: {
    requireAuth?: boolean;
    rateLimit?: {
      scope: UseCase;
      action: string;
      maxAttempts: number;
      windowMs: number;
    };
    validation?: (data: any) => void;
  },
) {
  const startTime = Date.now();

  try {
    // ---------------- AUTH ----------------
    if (options?.requireAuth && !request.auth?.uid) {
      throw new AuthenticationError();
    }

    // ---------------- SANITIZE ----------------
    const sanitizedData =
      request.data && typeof request.data === "object"
        ? InputValidator.sanitizeObject(request.data)
        : {};

    // ---------------- VALIDATION ----------------
    if (options?.validation) {
      options.validation(request.data);
    }

    // ---------------- RATE LIMIT ----------------
    if (options?.rateLimit) {
      try {
        await rateLimit.check(
          options.rateLimit.scope,
          options.rateLimit.action,
          {
            uid: request.auth?.uid ?? "anon",
            ip: "unknown",
            deviceId: "unknown",
          },
          {
            maxAttempts: options.rateLimit.maxAttempts,
            windowMs: options.rateLimit.windowMs,
          },
        );
      } catch (e: any) {
        throw new RateLimitError(e?.message ?? "Rate limit failed");
      }
    }

    // ---------------- EXECUTE ----------------
    const result = await handler({
      ...request,
      data: sanitizedData,
    });

    logEvent("security_success", "info", {
      duration: Date.now() - startTime,
    });

    return result;
  } catch (err) {
    logEvent("security_error", "error", {
      error: (err as any)?.message,
    });

    throw err;
  }
}
