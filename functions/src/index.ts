//////////////////////////////// index.ts ///////////////////////////////////////

// This file contains the implementation of the Firebase Cloud Functions

/////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/////////////////////////////////////////////////////////////////////////////////

// Firebase-Admin-initialization
if (!admin.apps.length) {
  admin.initializeApp();
}

import { authValidator } from "./functions/authValidator.function";
import { profileValidator } from "./functions/profileValidator.function";
import { projectsAndWorkValidator } from "./functions/projectAndWorkValidator.function";
import { secureDelete } from "./functions/secureDelete.function";

//////////////////////////////////////////////////////////////////////////////////

// Wrap each handler in a Firebase Cloud Function
export const authValidatorFunction = functions.https.onRequest(authValidator);

export const profileValidatorFunction =
  functions.https.onRequest(profileValidator);

export const projectsAndWorkValidatorFunction = functions.https.onRequest(
  projectsAndWorkValidator
);

export const secureDeleteFunction = functions.https.onRequest(secureDelete);

// Export the raw handlers functions
export {
  authValidator,
  profileValidator,
  projectsAndWorkValidator,
  secureDelete,
};
