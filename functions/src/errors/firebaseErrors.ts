////////////////////////////////// firebaseErrors.ts ///////////////////////////////////

// This file contains the firebase errors codes used in the application
// It also contains the createFirebaseError function, which is used to create firebase errors

////////////////////////////////////////////////////////////////////////////////////////

export type FirebaseFunctionErrorCode =
  | "aborted"
  | "already-exists"
  | "cancelled"
  | "data-loss"
  | "deadline-exceeded"
  | "failed-precondition"
  | "internal"
  | "invalid-argument"
  | "not-found"
  | "out-of-range"
  | "permission-denied"
  | "resource-exhausted"
  | "unauthenticated"
  | "unavailable"
  | "unknown";

export const FIREBASE_ERROR_CODES = {
  ABORTED: "aborted" as FirebaseFunctionErrorCode,
  ALREADY_EXISTS: "already-exists" as FirebaseFunctionErrorCode,
  CANCELLED: "cancelled" as FirebaseFunctionErrorCode,
  DATA_LOSS: "data-loss" as FirebaseFunctionErrorCode,
  DEADLINE_EXCEEDED: "deadline-exceeded" as FirebaseFunctionErrorCode,
  FAILED_PRECONDITION: "failed-precondition" as FirebaseFunctionErrorCode,
  INTERNAL: "internal" as FirebaseFunctionErrorCode,
  INVALID_ARGUMENT: "invalid-argument" as FirebaseFunctionErrorCode,
  NOT_FOUND: "not-found" as FirebaseFunctionErrorCode,
  OUT_OF_RANGE: "out-of-range" as FirebaseFunctionErrorCode,
  PERMISSION_DENIED: "permission-denied" as FirebaseFunctionErrorCode,
  RESOURCE_EXHAUSTED: "resource-exhausted" as FirebaseFunctionErrorCode,
  UNAUTHENTICATED: "unauthenticated" as FirebaseFunctionErrorCode,
  UNAVAILABLE: "unavailable" as FirebaseFunctionErrorCode,
  UNKNOWN: "unknown" as FirebaseFunctionErrorCode,
};

export interface FirebaseErrorDetails {
  code: FirebaseFunctionErrorCode;
  message: string;
  details?: any;
  stack?: string;
}

export function isFirebaseError(error: any): error is FirebaseErrorDetails {
  return error && typeof error === "object" && "code" in error;
}

export function createFirebaseError(
  code: FirebaseFunctionErrorCode,
  message: string,
  details?: any
): FirebaseErrorDetails {
  return {
    code,
    message,
    details,
    stack: new Error().stack,
  };
}
