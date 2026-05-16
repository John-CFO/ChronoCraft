// test/firebaseAdminTest.ts
import * as admin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8001";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:5001";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "test-project",
    storageBucket: "test-project.appspot.com",
  });
}

export { admin };
