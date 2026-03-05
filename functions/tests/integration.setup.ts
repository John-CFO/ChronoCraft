//////////////////////// integration.setup.ts /////////////////////////////////////

// This file contains the setup for the integration tests.

///////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

///////////////////////////////////////////////////////////////////////////////////

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8001";
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:5001";
}
if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
}
process.env.GCLOUD_PROJECT = "test-project";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "test-project" });
}
