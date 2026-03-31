////////////////////////// handleFunctionError.ts ////////////////////////////////

// This file contains the function to handle errorsfor the cloud functions in the application
// It also contains the mapDomainErrorToFirebase function, which is used to map domain errors to firebase errors

//////////////////////////////////////////////////////////////////////////////////

import { HttpsError } from "firebase-functions/v2/https";

import { FirebaseFunctionErrorCode } from "./firebaseErrors";
import { DomainError } from "./domain.errors";
import { logEvent } from "../utils/logger";
import { RateLimitError } from "../errors/domain.errors";

///////////////////////////////////////////////////////////////////////////////////

export function handleFunctionError(
  error: any,
  functionName?: string,
): HttpsError {
  // RateLimitError
  if (error instanceof RateLimitError) {
    logEvent(`Rate limit exceeded: ${error.message}`, "warn", {
      stack: error?.stack,
    });

    return new HttpsError(
      "resource-exhausted",
      error.userMessage || error.message,
    );
  }

  // handle DomainError
  if (error instanceof DomainError) {
    logEvent(
      `Domain error in ${functionName || "function"}: ${error.message}`,
      error.code === "failed-precondition" ? "warn" : "error",
      { code: error.code, stack: error?.stack },
    );

    const firebaseErrorCode = mapDomainErrorToFirebase(error.code);

    return new HttpsError(
      firebaseErrorCode,
      error.userMessage || error.message,
    );
  }

  // Firebase HttpsError
  if (error instanceof HttpsError) {
    logEvent(
      `HttpsError in ${functionName || "function"}: ${error.message}`,
      "error",
      { code: error.code, stack: error?.stack },
    );
    return error;
  }

  // Generic erros
  const rawCode = typeof error.code === "string" ? error.code : "";
  const code: FirebaseFunctionErrorCode =
    (rawCode.replace("functions/", "") as FirebaseFunctionErrorCode) ||
    "internal";

  // Log the error
  logEvent(
    `Error in ${functionName || "function"}: ${error.message || code}`,
    "error",
    { code, stack: error.stack },
  );

  // Cases for HttpsError
  switch (code) {
    case "invalid-argument":
      return new HttpsError(
        "invalid-argument",
        "Invalid entry. Please check your details.",
      );
    case "failed-precondition":
      return new HttpsError(
        "failed-precondition",
        "The request could not be processed due to a precondition.",
      );
    case "permission-denied":
      return new HttpsError(
        "permission-denied",
        "You do not have permission to perform this action.",
      );
    case "unauthenticated":
      return new HttpsError("unauthenticated", "Please log in again.");
    case "not-found":
      return new HttpsError(
        "not-found",
        "The requested resource was not found.",
      );
    case "resource-exhausted":
      return new HttpsError(
        "resource-exhausted",
        "Too many requests. Please try again later.",
      );
    case "internal":
      return new HttpsError("internal", "Internal server error.");
    case "unavailable":
      return new HttpsError(
        "unavailable",
        "The service is not available. Please try again later.",
      );
    default:
      return new HttpsError("internal", "Unexpected error");
  }
}

// Map domain errors to firebase errors
function mapDomainErrorToFirebase(
  domainCode: string,
): FirebaseFunctionErrorCode {
  const mapping: Record<string, FirebaseFunctionErrorCode> = {
    "not-found": "not-found",
    "permission-denied": "permission-denied",
    "validation-error": "invalid-argument",
    "rate-limit-exceeded": "resource-exhausted",
    "authentication-error": "unauthenticated",
    "failed-precondition": "failed-precondition",
    "conflict-error": "failed-precondition",
    "business-rule-error": "failed-precondition",
    "configuration-error": "internal",
    "database-error": "internal",
    "external-service-error": "unavailable",
  };

  return mapping[domainCode] || "internal";
}
