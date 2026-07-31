/////////////////////////////// index.ts /////////////////////////////

// This file contains all cloud functions for the application

//////////////////////////////////////////////////////////////////////

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

//////////////////////////////////////////////////////////////////////

console.log("[FUNCTIONS DEBUG] index.ts loaded");
console.log("[FUNCTIONS DEBUG] NODE_ENV:", process.env.NODE_ENV);
console.log("[FUNCTIONS DEBUG] GCLOUD_PROJECT:", process.env.GCLOUD_PROJECT);
console.log(
  "[FUNCTIONS DEBUG] FIREBASE_PROJECT:",
  process.env.FIREBASE_PROJECT,
);
console.log(
  "[FUNCTIONS DEBUG] FIREBASE_AUTH_EMULATOR_HOST:",
  process.env.FIREBASE_AUTH_EMULATOR_HOST,
);

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

type FirebaseConfig = {
  storageBucket?: string;
};

// Parse Firebase configuration to JSON
function parseFirebaseConfig(): FirebaseConfig {
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}") as FirebaseConfig;
  } catch {
    return {};
  }
}

// Initialize Firebase Admin (NO emulator-specific overrides)
if (!admin.apps.length) {
  const firebaseConfig = parseFirebaseConfig();

  const appOptions: admin.AppOptions = {};

  if (firebaseConfig.storageBucket) {
    appOptions.storageBucket = firebaseConfig.storageBucket;
  }

  admin.initializeApp(appOptions);
}

// HTTP handlers
import { authValidator } from "./functions/authValidator.function";
import { registerPushToken } from "./functions/registerPushToken.function";
import { projectsAndWorkValidator } from "./functions/projectAndWorkValidator.function";
import { secureDelete } from "./functions/secureDelete.function";
import { deleteUserDataHandler } from "./functions/deleteUserData.function";
import { requestPasswordReset } from "./functions/requestPasswordReset.function";

// TOTP handlers
import {
  checkTotpStatusHandler,
  createTotpSecretHandler,
  verifyTotpTokenHandler,
  verifyTotpLoginHandler,
} from "./functions/totp";
import { disableTotpHandler } from "./functions/disableTotp.function";

// export functions
console.log("[FUNCTIONS DEBUG] registering exports");
export const authValidatorFunction = authValidator;

console.log("[FUNCTIONS DEBUG] authValidatorFunction registered");
export const projectsAndWorkValidatorFunction = projectsAndWorkValidator;

console.log("[FUNCTIONS DEBUG] projectsAndWorkValidatorFunction registered");
export const secureDeleteFunction = secureDelete;

console.log("[FUNCTIONS DEBUG] secureDeleteFunction registered");
export const checkTotpStatus = onCall({ cors: true }, checkTotpStatusHandler);

console.log("[FUNCTIONS DEBUG] checkTotpStatus registered");
export const disableTotp = onCall({ cors: true }, disableTotpHandler);

console.log("[FUNCTIONS DEBUG] disableTotp registered");
export const createTotpSecret = onCall({ cors: true }, createTotpSecretHandler);

console.log("[FUNCTIONS DEBUG] createTotpSecret registered");
export const verifyTotpToken = onCall({ cors: true }, verifyTotpTokenHandler);

console.log("[FUNCTIONS DEBUG] verifyTotpToken registered");
export const verifyTotpLogin = onCall({ cors: true }, verifyTotpLoginHandler);

console.log("[FUNCTIONS DEBUG] verifyTotpLogin registered");
export const deleteUserData = onCall({ cors: true }, deleteUserDataHandler);

console.log("[FUNCTIONS DEBUG] deleteUserData registered");
export const requestPasswordResetFunction = onCall(
  { cors: true },
  requestPasswordReset,
);

console.log("[FUNCTIONS DEBUG] requestPasswordResetFunction registered");
export const registerPushTokenFunction = onCall(
  { cors: true },
  registerPushToken,
);
console.log("[FUNCTIONS DEBUG] registerPushTokenFunction registered");
