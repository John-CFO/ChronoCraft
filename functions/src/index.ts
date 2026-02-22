/////////////////////////////// index.ts /////////////////////////////

// This file contains all cloud functions for the application

///////////////////////////////////////////////////////////////////////

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

if (!admin.apps.length) {
  admin.initializeApp();
}

// HTTP handlers
import { authValidator } from "./functions/authValidator.function";
import { profileValidator } from "./functions/profileValidator.function";
import { projectsAndWorkValidator } from "./functions/projectAndWorkValidator.function";
import { secureDelete } from "./functions/secureDelete.function";

// TOTP handlers
import {
  checkTotpStatusHandler,
  createTotpSecretHandler,
  verifyTotpTokenHandler,
  verifyTotpLoginHandler,
} from "./functions/totp";
import { disableTotpHandler } from "./functions/disableTotp.function";

//////////////////////////////////////////////////////////////////////////////////////////

// HTTP (REST) Functions
export const authValidatorFunction = onRequest(authValidator);
export const profileValidatorFunction = onRequest(profileValidator);
export const projectsAndWorkValidatorFunction = onRequest(
  projectsAndWorkValidator,
);
export const secureDeleteFunction = onRequest(secureDelete);

// Callable Functions
export const checkTotpStatus = onCall({ cors: true }, checkTotpStatusHandler);

export const disableTotp = onCall({ cors: true }, disableTotpHandler);

export const createTotpSecret = onCall({ cors: true }, createTotpSecretHandler);

export const verifyTotpToken = onCall({ cors: true }, verifyTotpTokenHandler);

export const verifyTotpLogin = onCall({ cors: true }, verifyTotpLoginHandler);
