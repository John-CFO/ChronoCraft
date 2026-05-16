//////////////////////// functions.ts //////////////////////////////

// This wrapper is used to connect to Firebase functions with the client

////////////////////////////////////////////////////////////////////

import { getFunctions, httpsCallable } from "firebase/functions";

import { FIREBASE_APP } from "../firebaseConfig";

////////////////////////////////////////////////////////////////////

const functions = getFunctions(FIREBASE_APP);

export const projectsAndWorkValidatorCallable = httpsCallable(
  functions,
  "projectsAndWorkValidatorFunction",
);
