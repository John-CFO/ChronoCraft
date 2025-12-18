// functions/src/errors/firebaseErrors.ts

export type FirebaseFunctionErrorCode =
  | "invalid-argument"
  | "failed-precondition"
  | "permission-denied"
  | "unauthenticated"
  | "not-found"
  | "resource-exhausted"
  | "internal"
  | "unavailable"
  | "unknown";
