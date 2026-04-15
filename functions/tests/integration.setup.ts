//////////////////////// integration.setup.ts /////////////////////////////////////

// Setup for integration tests (Firebase emulators + controlled test environment)

///////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

///////////////////////////////////////////////////////////////////////////////////

// Emulator configuration
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

process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_DISABLED = "true";
process.env.RATE_LIMIT_HMAC_KEY = "test-hmac-key";

// Firebase Admin init (idempotent)
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "test-project" });
}
