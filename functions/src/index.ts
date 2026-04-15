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

function parseFirebaseConfig(): FirebaseConfig {
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}") as FirebaseConfig;
  } catch {
    return {};
  }
}

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
import { profileValidator } from "./functions/profileValidator.function";
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

//////////////////////////////////////////////////////////////////////////////////////////

// Export all functions with clear naming for deployment and testing
export const authValidatorFunction = authValidator;
export const profileValidatorFunction = profileValidator;
export const projectsAndWorkValidatorFunction = projectsAndWorkValidator;
export const secureDeleteFunction = secureDelete;

// Callable Functions
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
