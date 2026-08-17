////////////////////////// handleFunctionError.ts ////////////////////////////////

// This file contains the function to handle errorsfor the cloud functions in the application
// It also contains the mapDomainErrorToFirebase function, which is used to map domain errors to firebase errors

//////////////////////////////////////////////////////////////////////////////////

import { HttpsError } from "firebase-functions/v2/https";

import { FirebaseFunctionErrorCode } from "./firebaseErrors";
import { DomainError } from "./domain.errors";
import { logEvent } from "../utils/logger";
import { getTranslation } from "../services/localization/i18n";

///////////////////////////////////////////////////////////////////////////////////

export async function handleFunctionError(
  error: any,
  functionName?: string,
  language?: string | null,
): Promise<HttpsError> {
  // use getTranslation to get the current language
  const t = await getTranslation(language);

  // handle DomainError
  if (error instanceof DomainError) {
    const firebaseErrorCode = mapDomainErrorToFirebase(error.code);

    const level = firebaseErrorCode === "permission-denied" ? "warn" : "error";

    logEvent(`Domain error in ${functionName || "function"}`, level, {
      code: error.code,
    });

    return new HttpsError(
      firebaseErrorCode,
      t(error.userMessageKey ?? "errors.unexpected"),
    );
  }

  // Firebase HttpsError
  if (error instanceof HttpsError) {
    logEvent(`HttpsError in ${functionName || "function"}`, "error", {
      code: error.code,
    });
    return error;
  }

  // Generic errors
  const rawCode = typeof error.code === "string" ? error.code : "";
  const code: FirebaseFunctionErrorCode =
    (rawCode.replace("functions/", "") as FirebaseFunctionErrorCode) ||
    "internal";

  // Log the error without exposing error details
  logEvent(`Error in ${functionName || "function"}`, "error", { code });

  // Cases for HttpsError
  switch (code) {
    case "invalid-argument":
      return new HttpsError("invalid-argument", t("errors.invalidEntry"));

    case "failed-precondition":
      return new HttpsError(
        "failed-precondition",
        t("errors.failedPrecondition"),
      );

    case "permission-denied":
      return new HttpsError("permission-denied", t("errors.permissionDenied"));

    case "unauthenticated":
      return new HttpsError("unauthenticated", t("errors.unauthenticated"));

    case "not-found":
      return new HttpsError("not-found", t("errors.resourceNotFound"));

    case "resource-exhausted":
      return new HttpsError("resource-exhausted", t("errors.tooManyRequests"));

    case "internal":
      return new HttpsError("internal", t("errors.internal"));

    case "unavailable":
      return new HttpsError("unavailable", t("errors.unavailable"));

    default:
      return new HttpsError("internal", t("errors.unexpected"));
  }
}

// Map domain errors to firebase errors
function mapDomainErrorToFirebase(
  domainCode: string,
): FirebaseFunctionErrorCode {
  const mapping: Record<string, FirebaseFunctionErrorCode> = {
    "not-found": "not-found",
    "permission-denied": "permission-denied",
    "authorization-error": "permission-denied",
    "ownership-error": "permission-denied",
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
