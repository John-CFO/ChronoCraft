//////////////////////// integration.setup.ts /////////////////////////////////////

// This file contains the setup for the integration tests.

///////////////////////////////////////////////////////////////////////////////////

process.env.FIRESTORE_EMULATOR_HOST = "localhost:8001";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:5001";
process.env.GCLOUD_PROJECT = "test-project";

///////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

///////////////////////////////////////////////////////////////////////////////////

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "test-project" });
}

const firestore = admin.firestore();
firestore.settings({ host: "localhost:8001", ssl: false });
