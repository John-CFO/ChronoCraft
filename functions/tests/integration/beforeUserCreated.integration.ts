///////////////////////////// beforeUserCreated.integration.ts //////////////////////////

// Integration tests for beforeUserCreated whitelist validation against Firebase Auth Emulator

//////////////////////////////////////////////////////////////////////////////////////

import { admin } from "../../tests/firebaseAdminTest";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  connectAuthEmulator,
} from "firebase/auth";

//////////////////////////////////////////////////////////////////////////////////////

const clientApp = initializeApp({
  apiKey: "demo-test-api-key",
  authDomain: "demo-test.firebaseapp.com",
  projectId: "demo-test",
});

const auth = getAuth(clientApp);
connectAuthEmulator(auth, "http://127.0.0.1:5001");

//////////////////////////////////////////////////////////////////////////////////////

const ensureFirebaseEmulators = () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run tests with `firebase emulators:exec`.",
    );
  }

  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error(
      "FIREBASE_AUTH_EMULATOR_HOST is not set. Run tests with `firebase emulators:exec`.",
    );
  }
};

ensureFirebaseEmulators();

//////////////////////////////////////////////////////////////////////////////////////

describe("beforeUserCreated whitelist validation (integration)", () => {
  const firestore = admin.firestore();

  const cleanupEmails: string[] = [];

  afterEach(async () => {
    for (const email of cleanupEmails) {
      const user = await admin
        .auth()
        .getUserByEmail(email)
        .catch(() => null);

      if (user) {
        await admin.auth().deleteUser(user.uid);
      }

      await firestore
        .collection("security")
        .doc("auth")
        .collection("reviewers")
        .doc(email)
        .delete()
        .catch(() => {
          /* ignore */
        });
    }

    cleanupEmails.length = 0;
  });

  it("should reject registration for non-whitelisted user", async () => {
    const email = `blocked-${Date.now()}@example.com`;
    cleanupEmails.push(email);

    await expect(
      createUserWithEmailAndPassword(auth, email, "Password123!"),
    ).rejects.toThrow();
  });

  it("should allow registration for active whitelisted reviewer", async () => {
    const email = `reviewer-${Date.now()}@example.com`;
    cleanupEmails.push(email);

    await firestore
      .collection("security")
      .doc("auth")
      .collection("reviewers")
      .doc(email)
      .set({
        active: true,
      });

    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      "Password123!",
    );

    expect(credential.user.email).toBe(email);
  });
});
