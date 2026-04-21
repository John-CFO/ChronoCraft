///////////////////////////////// security.ts //////////////////////////////////////

// This file contains the security utilities for the cloud functions in the application

////////////////////////////////////////////////////////////////////////////////////

import { onCall, CallableRequest } from "firebase-functions/v2/https";

import { logEvent } from "../utils/logger";
import { rateLimit } from "../utils/rateLimitInstance";
import { ValidationError, AuthenticationError } from "../errors/domain.errors";
import { RateLimitError } from "../errors/domain.errors";
import { handleFunctionError } from "../errors/handleFunctionError";

////////////////////////////////////////////////////////////////////////////////////

// Input validation utilities
export class InputValidator {
  static validateRequired(data: any, field: string): void {
    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
    ) {
      throw new ValidationError(`Field '${field}' is required`);
    }
  }

  static validateString(
    data: any,
    field: string,
    minLength?: number,
    maxLength?: number,
  ): void {
    this.validateRequired(data, field);

    if (typeof data[field] !== "string") {
      throw new ValidationError(`Field '${field}' must be a string`);
    }
    if (minLength !== undefined && data[field].length < minLength) {
      throw new ValidationError(
        `Field '${field}' must be at least ${minLength} characters`,
      );
    }
    if (maxLength !== undefined && data[field].length > maxLength) {
      throw new ValidationError(
        `Field '${field}' must be at most ${maxLength} characters`,
      );
    }
  }

  static validateEmail(data: any, field: string): void {
    this.validateString(data, field);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data[field])) {
      throw new ValidationError(
        `Field '${field}' must be a valid email address`,
      );
    }
  }

  static validateNumber(
    data: any,
    field: string,
    min?: number,
    max?: number,
  ): void {
    this.validateRequired(data, field);

    const value = Number(data[field]);
    if (isNaN(value)) {
      throw new ValidationError(`Field '${field}' must be a number`);
    }
    if (min !== undefined && value < min) {
      throw new ValidationError(`Field '${field}' must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      throw new ValidationError(`Field '${field}' must be at most ${max}`);
    }
  }

  static sanitizeString(input: string): string {
    return input.replace(/[<>]/g, "").trim();
  }

  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
      const value = sanitized[key];
      if (typeof value === "string") {
        sanitized[key] = this.sanitizeString(value) as T[typeof key];
      }
    }

    return sanitized;
  }
}

// Secure function wrapper
export const secureFunction = (
  handler: (request: CallableRequest) => Promise<any>,
  options?: {
    requireAuth?: boolean;
    rateLimit?: { action: string; maxAttempts: number; windowMs: number };
    validation?: (data: any) => void;
  },
) => {
  return onCall(async (request: CallableRequest) => {
    const startTime = Date.now();
    const functionName = handler.name || "anonymous";

    try {
      // Auth
      if (options?.requireAuth && !request.auth) {
        throw new AuthenticationError();
      }

      // Validation
      if (options?.validation) {
        options.validation(request.data);
      }

      // Sanitizing
      const sanitizedData = InputValidator.sanitizeObject(request.data || {});

      // ---------------- RATE LIMIT (NEW MODEL) ----------------
      const rawHeaders = (request as any).rawRequest?.headers ?? {};
      const forwarded =
        rawHeaders["x-forwarded-for"] ||
        rawHeaders["x-real-ip"] ||
        rawHeaders["x-appengine-user-ip"];

      const clientIp = forwarded
        ? String(forwarded).split(",")[0].trim()
        : null;

      const deviceId = (request.data as any)?.deviceId ?? null;
      const actionName = options?.rateLimit?.action ?? "default";

      if (options?.rateLimit) {
        try {
          await rateLimit.check(
            "security",
            actionName,
            {
              uid: request.auth?.uid || "anon",
              ip: clientIp || "unknown",
              deviceId: deviceId || "unknown",
            },
            {
              maxAttempts: options.rateLimit.maxAttempts,
              windowMs: options.rateLimit.windowMs,
            },
          );
        } catch (e: any) {
          if (e instanceof RateLimitError || e?.retryAfterSeconds) {
            throw e;
          }

          logEvent("ratelimit-check-failed", "error", {
            error: e?.message ?? String(e),
          });
        }
      }

      // Execute handler
      const result = await handler({
        ...request,
        data: sanitizedData,
      });

      const duration = Date.now() - startTime;

      logEvent("Function execution completed", "info", {
        functionName,
        uid: request.auth?.uid,
        duration,
        success: true,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logEvent("Function execution failed", "error", {
        functionName,
        uid: request.auth?.uid,
        duration,
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
      });

      throw handleFunctionError(error);
    }
  });
};
