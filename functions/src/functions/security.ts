/////////////////////////////// security.ts ////////////////////////////////

import { ValidationError } from "../errors/domain.errors";
import { handleFunctionError } from "../errors/handleFunctionError";
import { secureCore } from "./secureCore";
import { getTranslation } from "../services/localization/i18n";

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
  static async validateRequired(data: any, field: string): Promise<void> {
    // use getTranslation to get the current language
    const t = await getTranslation(data?.language);

    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
    ) {
      throw new ValidationError(t("validation.fieldRequired", { field }));
    }
  }

  static async validateString(
    data: any,
    field: string,
    minLength?: number,
    maxLength?: number,
  ): Promise<void> {
    await this.validateRequired(data, field);

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

  static async validateNumber(
    data: any,
    field: string,
    min?: number,
    max?: number,
  ): Promise<void> {
    await this.validateRequired(data, field);

    const t = await getTranslation(data?.language);

    const value = Number(data[field]);

    if (isNaN(value)) {
      throw new ValidationError(t("validation.fieldMustBeNumber", { field }));
    }

    if (min !== undefined && value < min) {
      throw new ValidationError(
        t("validation.fieldMinValue", {
          field,
          min,
        }),
      );
    }

    if (max !== undefined && value > max) {
      throw new ValidationError(
        t("validation.fieldMaxValue", {
          field,
          max,
        }),
      );
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
    validation?: (data: any) => void | Promise<void>;
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
