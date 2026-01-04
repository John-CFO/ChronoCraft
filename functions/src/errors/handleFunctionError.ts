////////////////////////// handleFunctionError.ts ////////////////////////////////

// This file contains the function to handle errorsfor the cloud functions in the application
// It also contains the mapDomainErrorToFirebase function, which is used to map domain errors to firebase errors

//////////////////////////////////////////////////////////////////////////////////

import { https } from "firebase-functions/v2";

import { FirebaseFunctionErrorCode } from "./firebaseErrors";
import { DomainError } from "./domain.errors";
import { logEvent } from "../utils/logger";
import { RateLimitError } from "../errors/domain.errors";

///////////////////////////////////////////////////////////////////////////////////

export function handleFunctionError(
  error: any,
  functionName?: string
): https.HttpsError {
  // handle DomainError
  if (error instanceof DomainError) {
    logEvent(
      `Domain error in ${functionName || "function"}: ${error.message}`,
      "error",
      { code: error.code, stack: error.stack }
    );

    // DomainError to map HttpsError
    const firebaseErrorCode = mapDomainErrorToFirebase(error.code);
    return new https.HttpsError(
      firebaseErrorCode,
      error.userMessage || error.message
    );
  }

  // Firebase HttpsError
  if (error instanceof https.HttpsError) {
    logEvent(
      `HttpsError in ${functionName || "function"}: ${error.message}`,
      "error",
      { code: error.code, stack: error.stack }
    );
    return error;
  }

  // RateLimitError
  if (error instanceof RateLimitError) {
    logEvent(`Rate limit exceeded: ${error.message}`, "warn", {
      stack: error.stack,
    });
    return new https.HttpsError(
      "resource-exhausted",
      error.message || "Rate limit exceeded. Please try again later."
    );
  }

  // Generic erros
  const code: FirebaseFunctionErrorCode =
    (error.code?.replace("functions/", "") as FirebaseFunctionErrorCode) ||
    "unknown";

  // Log the error
  logEvent(
    `Error in ${functionName || "function"}: ${error.message || code}`,
    "error",
    { code, stack: error.stack }
  );

  // Cases for HttpsError
  switch (code) {
    case "invalid-argument":
      return new https.HttpsError(
        "invalid-argument",
        "Invalid entry. Please check your details."
      );
    case "failed-precondition":
      return new https.HttpsError(
        "failed-precondition",
        "The request could not be processed due to a precondition."
      );
    case "permission-denied":
      return new https.HttpsError(
        "permission-denied",
        "You do not have permission to perform this action."
      );
    case "unauthenticated":
      return new https.HttpsError("unauthenticated", "Please log in again.");
    case "not-found":
      return new https.HttpsError(
        "not-found",
        "The requested resource was not found."
      );
    case "resource-exhausted":
      return new https.HttpsError(
        "resource-exhausted",
        "Too many requests. Please try again later."
      );
    case "internal":
      return new https.HttpsError("internal", "Internal server error.");
    case "unavailable":
      return new https.HttpsError(
        "unavailable",
        "The service is not available. Please try again later."
      );
    default:
      return new https.HttpsError(
        "internal",
        "An error occurred. Please try again."
      );
  }
}

// Map domain errors to firebase errors
function mapDomainErrorToFirebase(
  domainCode: string
): FirebaseFunctionErrorCode {
  const mapping: Record<string, FirebaseFunctionErrorCode> = {
    "not-found": "not-found",
    "permission-denied": "permission-denied",
    "validation-error": "invalid-argument",
    "rate-limit-exceeded": "resource-exhausted",
  };

  return mapping[domainCode] || "internal";
}
