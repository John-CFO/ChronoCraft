////////////////////// firebaseAdmin.ts //////////////////////

// This file contains the initialization of the Firebase Admin SDK.

///////////////////////////////////////////////////////////////

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

///////////////////////////////////////////////////////////////

if (!getApps().length) {
  initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "test-project",
  });
}

const firestore = getFirestore();
const auth = getAuth();

export { firestore, auth, FieldValue, Timestamp };
