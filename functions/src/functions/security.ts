///////////////////////////////// security.ts //////////////////////////////////////

// This file contains the security utilities for the cloud functions in the application

////////////////////////////////////////////////////////////////////////////////////

import { onCall, CallableRequest } from "firebase-functions/v2/https";
import admin from "firebase-admin";

import { logEvent } from "../utils/logger";
import { rateLimit } from "../utils/rateLimit";
import { ValidationError, AuthenticationError } from "../errors/domain.errors";
import { RateLimitError } from "../errors/domain.errors";
import { handleFunctionError } from "../errors/handleFunctionError";

////////////////////////////////////////////////////////////////////////////////////

const db = admin.firestore();

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

    // check if field is a string
    if (typeof data[field] !== "string") {
      throw new ValidationError(`Field '${field}' must be a string`);
    }
    // check if field is too short
    if (minLength !== undefined && data[field].length < minLength) {
      throw new ValidationError(
        `Field '${field}' must be at least ${minLength} characters`,
      );
    }
    // check if field is too long
    if (maxLength !== undefined && data[field].length > maxLength) {
      throw new ValidationError(
        `Field '${field}' must be at most ${maxLength} characters`,
      );
    }
  }

  // Validate and sanatize email
  static validateEmail(data: any, field: string): void {
    this.validateString(data, field);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data[field])) {
      throw new ValidationError(
        `Field '${field}' must be a valid email address`,
      );
    }
  }

  // Validate number
  static validateNumber(
    data: any,
    field: string,
    min?: number,
    max?: number,
  ): void {
    this.validateRequired(data, field);

    const value = Number(data[field]);
    // check if field is not a number
    if (isNaN(value)) {
      throw new ValidationError(`Field '${field}' must be a number`);
    }
    // check if field is too small
    if (min !== undefined && value < min) {
      throw new ValidationError(`Field '${field}' must be at least ${min}`);
    }
    // check if field is too big
    if (max !== undefined && value > max) {
      throw new ValidationError(`Field '${field}' must be at most ${max}`);
    }
  }

  // Sanitize string input
  static sanitizeString(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, "") // Remove < and >
      .trim();
  }

  // Sanitize object input
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
      const value = sanitized[key];
      // Check if value is a string
      if (typeof value === "string") {
        // Sanitize only string fields
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
      // Authentification
      if (options?.requireAuth && !request.auth) {
        throw new AuthenticationError();
      }

      // Input-Validation
      if (options?.validation) {
        options.validation(request.data);
      }

      // Input sanitizing
      const sanitizedData = InputValidator.sanitizeObject(request.data || {});

      // --- Multi-Scope Rate Limiting ---
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

      try {
        // user-level (UID)
        if (options?.rateLimit && request.auth?.uid) {
          await rateLimit.checkLimit(
            request.auth.uid,
            actionName,
            options.rateLimit.maxAttempts,
            options.rateLimit.windowMs,
          );
        }

        // ip-level (optional, permissiv, secures bot attacks even without auth)
        if (clientIp) {
          await rateLimit.checkIP(clientIp, actionName, 30, 10 * 60_000);
        }

        // device-level (harder if device is unknown, to prevent spoofing)
        if (deviceId) {
          const userDevicesRef = db
            .collection("Users")
            .doc(request.auth?.uid || "anon")
            .collection("devices")
            .doc(deviceId);
          const known = (await userDevicesRef.get()).exists;
          await rateLimit.checkDevice(
            deviceId,
            actionName,
            known ? 10 : 2,
            60_000,
            { strict: !known },
          );
        }
      } catch (e: any) {
        if (e instanceof RateLimitError || e?.retryAfterSeconds) {
          throw e; // throw RateLimitError directly to be handled in the error handler
        }
        logEvent("ratelimit-check-failed", "error", {
          error: e?.message ?? String(e),
        });
      }

      // call handler with sanitized data
      const result = await handler({
        ...request,
        data: sanitizedData,
      });

      // log success with duration and user info
      const duration = Date.now() - startTime;
      logEvent("Function execution completed", "info", {
        functionName,
        uid: request.auth?.uid,
        duration,
        success: true,
      });

      return result;
    } catch (error: any) {
      // log error with duration and user info
      const duration = Date.now() - startTime;
      logEvent("Function execution failed", "error", {
        functionName,
        uid: request.auth?.uid,
        duration,
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
      });

      // error handling: convert to standardized error response
      throw handleFunctionError(error);
    }
  });
};
