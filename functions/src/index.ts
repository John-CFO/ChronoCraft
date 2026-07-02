/////////////////////////////// index.ts /////////////////////////////

// This file contains all cloud functions for the application

//////////////////////////////////////////////////////////////////////

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

//////////////////////////////////////////////////////////////////////

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

// ENV GUARDS (fail fast)
if (!process.env.RATE_LIMIT_HMAC_KEY) {
  throw new Error("Missing RATE_LIMIT_HMAC_KEY");
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
export const authValidatorFunction = authValidator;
export const projectsAndWorkValidatorFunction = projectsAndWorkValidator;
export const secureDeleteFunction = secureDelete;

export const checkTotpStatus = onCall({ cors: true }, checkTotpStatusHandler);
export const disableTotp = onCall({ cors: true }, disableTotpHandler);
export const createTotpSecret = onCall({ cors: true }, createTotpSecretHandler);
export const verifyTotpToken = onCall({ cors: true }, verifyTotpTokenHandler);
export const verifyTotpLogin = onCall({ cors: true }, verifyTotpLoginHandler);
export const deleteUserData = onCall({ cors: true }, deleteUserDataHandler);

export const requestPasswordResetFunction = onCall(
  { cors: true },
  requestPasswordReset,
);

export const registerPushTokenFunction = onCall(
  { cors: true },
  registerPushToken,
);
