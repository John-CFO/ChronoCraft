///////////////////////////////// security.ts //////////////////////////////////////

// This file contains the security utilities for the cloud functions in the application

////////////////////////////////////////////////////////////////////////////////////

import { https } from "firebase-functions/v2";

import { logEvent } from "../utils/logger";
import { ValidationError, AuthenticationError } from "../errors/domain.errors";
import { handleFunctionError } from "../errors/handleFunctionError";

////////////////////////////////////////////////////////////////////////////////////

// Security headers configuration
export interface SecurityHeaders {
  "Content-Security-Policy"?: string;
  "Strict-Transport-Security"?: string;
  "X-Content-Type-Options"?: string;
  "X-Frame-Options"?: string;
  "X-XSS-Protection"?: string;
}

export const DEFAULT_SECURITY_HEADERS: SecurityHeaders = {
  "Content-Security-Policy": "default-src 'self'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
};

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
    maxLength?: number
  ): void {
    this.validateRequired(data, field);

    // check if field is a string
    if (typeof data[field] !== "string") {
      throw new ValidationError(`Field '${field}' must be a string`);
    }
    // check if field is too short
    if (minLength !== undefined && data[field].length < minLength) {
      throw new ValidationError(
        `Field '${field}' must be at least ${minLength} characters`
      );
    }
    // check if field is too long
    if (maxLength !== undefined && data[field].length > maxLength) {
      throw new ValidationError(
        `Field '${field}' must be at most ${maxLength} characters`
      );
    }
  }

  // Validate and sanatize email
  static validateEmail(data: any, field: string): void {
    this.validateString(data, field);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data[field])) {
      throw new ValidationError(
        `Field '${field}' must be a valid email address`
      );
    }
  }

  static validateNumber(
    data: any,
    field: string,
    min?: number,
    max?: number
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
  handler: (request: https.CallableRequest) => Promise<any>,
  options?: {
    requireAuth?: boolean;
    rateLimit?: { action: string; maxAttempts: number; windowMs: number };
    validation?: (data: any) => void;
    headers?: Record<string, string>;
  }
) => {
  // Secure function call
  return https.onCall(async (request: https.CallableRequest) => {
    const startTime = Date.now();
    const functionName = handler.name || "anonymous";

    try {
      // Authentication check
      if (options?.requireAuth && !request.auth) {
        throw new AuthenticationError();
      }

      // Rate limiting
      if (options?.rateLimit && request.auth?.uid) {
        const { rateLimiter } = await import("../utils/rateLimit");
        await rateLimiter.checkLimit(
          request.auth.uid,
          options.rateLimit.action,
          options.rateLimit.maxAttempts,
          options.rateLimit.windowMs
        );
      }

      // Input validation
      if (options?.validation) {
        options.validation(request.data);
      }

      // Sanitize input
      const sanitizedData = InputValidator.sanitizeObject(request.data || {});

      // Execute handler
      const result = await handler({
        ...request,
        data: sanitizedData,
      });

      // Log success
      const duration = Date.now() - startTime;
      logEvent("Function execution completed", "info", {
        functionName,
        uid: request.auth?.uid,
        duration,
        success: true,
      });

      // Add security headers to response
      const headers = { ...DEFAULT_SECURITY_HEADERS, ...options?.headers };
      const response: any = result;
      response.__headers = headers;

      return response;
    } catch (error: any) {
      // Log error
      const duration = Date.now() - startTime;
      logEvent("Function execution failed", "error", {
        functionName,
        uid: request.auth?.uid,
        duration,
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
      });

      // Error handling
      throw handleFunctionError(error);
    }
  });
};
