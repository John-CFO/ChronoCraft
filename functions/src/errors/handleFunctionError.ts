/////////////////// handleFunctionError.ts ///////////////////////

// This file contains the function that handles Firebase errors and returns a user-friendly error message

//////////////////////////////////////////////////////////////////

import { FirebaseFunctionErrorCode } from "./firebaseErrors";
import { logEvent } from "../logging/logger";

//////////////////////////////////////////////////////////////////

export function handleFunctionError(error: any, functionName?: string): string {
  const code: FirebaseFunctionErrorCode =
    (error.code?.replace("functions/", "") as FirebaseFunctionErrorCode) ||
    "unknown";

  // log the error
  logEvent(
    `Error in ${functionName || "function"}: ${error.message || code}`,
    "error",
    {
      code,
      stack: error.stack,
    }
  );

  switch (code) {
    case "invalid-argument":
      return "Invalid entry. Please check your details.";
    case "failed-precondition":
      return "The request could not be processed due to a precondition.";
    case "permission-denied":
      return "You do not have permission to perform this action.";
    case "unauthenticated":
      return "Please log in again.";
    case "not-found":
      return "The requested resource was not found.";
    case "resource-exhausted":
      return "Too many requests. Please try again later.";
    case "internal":
      return "Internal server error.";
    case "unavailable":
      return "The service is not available. Please try again later.";
    default:
      return "An error occurred. Please try again.";
  }
}
