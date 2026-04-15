// test/firebaseAdminTest.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "test-project",
    storageBucket: "test-project.appspot.com",
  });
}

export { admin };
