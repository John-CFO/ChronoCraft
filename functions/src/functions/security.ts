/////////////////////////////// security.ts ////////////////////////////////

import { ValidationError } from "../errors/domain.errors";
import { handleFunctionError } from "../errors/handleFunctionError";
import { secureCore } from "./secureCore";

//////////////////////////////////////////////////////////////////////////////

// CallableRequest ohne Firebase dependency
export type CallableRequest = {
  auth?: { uid?: string };
  data?: any;
  rawRequest?: any;
};

//////////////////////////////////////////////////////////////////////////////

// Lazy Firebase import (verhindert Jest / build crashes)
let onCall: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  onCall = require("firebase-functions/v2/https").onCall;
} catch {
  onCall = (fn: any) => fn; // test / non-firebase environment
}

//////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////

// Pure wrapper (TESTABLE, NO Firebase)
export const secureFunctionInternal = (
  handler: (request: CallableRequest) => Promise<any>,
  options?: {
    requireAuth?: boolean;
    rateLimit?: any;
    validation?: (data: any) => void;
  },
) => {
  return async (request: CallableRequest) => {
    try {
      return await secureCore(request, handler, options);
    } catch (error) {
      throw handleFunctionError(error);
    }
  };
};

//////////////////////////////////////////////////////////////////////////////

// Firebase entrypoint (RUNTIME ONLY)
export const secureFunction = (handler: any, options?: any) => {
  return onCall(secureFunctionInternal(handler, options));
};
