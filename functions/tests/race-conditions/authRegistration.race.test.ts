//////////////////////////// authRegistration.race.test.ts //////////////////////////

// Auth Registration Race Tests
//
// This file contains race condition tests for Firebase Auth registration.
//
// The test runs through the real registration flow:
//
// Client
//   |
//   v
// Firebase Auth Emulator
//   |
//   v
// beforeUserCreated Cloud Function Trigger
//   |
//   v
// Firestore whitelist validation (/auth/reviewers/{email})
//   |
//   v
// Firebase Auth user creation
//
// Purpose:
// Verify that concurrent registration attempts do not bypass or corrupt
// whitelist based registration rules.
//
// Covered scenarios:
//
// - Multiple concurrent registrations with the same whitelisted email
//   -> expected: whitelist validation remains consistent
//
// - Multiple concurrent registrations with different whitelisted reviewers
//   -> expected: all valid registrations succeed
//
// - Multiple concurrent registrations without whitelist entry
//   -> expected: all registrations are rejected
//
// Assertions:
//
// - Whitelist entries remain unchanged
// - Valid registrations succeed
// - Invalid registrations are rejected
//
//////////////////////////////////////////////////////////////////////////////////////

import { admin } from "../../tests/firebaseAdminTest";
import {
  createUserWithEmailAndPassword,
  getAuth,
  connectAuthEmulator,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

import { runRace } from "./hardness/raceRunner";

////////////////////////////////////////////////////////////////////////////////////////

const clientApp = initializeApp({
  apiKey: "demo-test-api-key",
  authDomain: "demo-test.firebaseapp.com",
  projectId: "demo-test",
});

const auth = getAuth(clientApp);

connectAuthEmulator(auth, "http://127.0.0.1:5001");

////////////////////////////////////////////////////////////////////////////////////////

const firestore = admin.firestore();

const createWhitelistEntry = async (email: string) => {
  await firestore
    .collection("auth")
    .doc("reviewers")
    .collection("reviewers")
    .doc(email)
    .set({
      active: true,
    });
};

////////////////////////////////////////////////////////////////////////////////////////

describe("Auth Registration Race Conditions", () => {
  afterEach(async () => {
    const users = await admin.auth().listUsers(1000);

    for (const user of users.users) {
      if (user.email?.includes("@race-test.com")) {
        await admin.auth().deleteUser(user.uid);
      }
    }

    const snapshot = await firestore
      .collection("auth")
      .doc("reviewers")
      .collection("reviewers")
      .get();

    await Promise.all(
      snapshot.docs
        .filter((doc) => doc.id.includes("@race-test.com"))
        .map((doc) => doc.ref.delete()),
    );
  });

  it("should keep whitelist validation consistent for concurrent registrations with same whitelisted email", async () => {
    const email = `race-${Date.now()}@race-test.com`;

    await createWhitelistEntry(email);

    const results = await runRace({
      participants: 20,

      operation: async () => {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          "Password123!",
        );

        return credential.user.email;
      },
    });

    expect(results.every((result) => result.success)).toBe(true);

    const whitelistDoc = await firestore
      .collection("auth")
      .doc("reviewers")
      .collection("reviewers")
      .doc(email)
      .get();

    expect(whitelistDoc.exists).toBe(true);
    expect(whitelistDoc.data()).toEqual({
      active: true,
    });
  });

  it("should allow concurrent registrations for different whitelisted users", async () => {
    const emails = Array.from(
      { length: 20 },
      (_, index) => `reviewer-${Date.now()}-${index}@race-test.com`,
    );

    await Promise.all(emails.map((email) => createWhitelistEntry(email)));

    const results = await runRace({
      participants: emails.length,

      operation: async (index) => {
        const credential = await createUserWithEmailAndPassword(
          auth,
          emails[index],
          "Password123!",
        );

        return credential.user.email;
      },
    });

    expect(results.every((result) => result.success)).toBe(true);

    const users = await admin.auth().listUsers(1000);

    const createdUsers = users.users.filter((user) =>
      emails.includes(user.email ?? ""),
    );

    expect(createdUsers).toHaveLength(20);
  });

  it("should reject concurrent registrations without whitelist entry", async () => {
    const email = `blocked-${Date.now()}@race-test.com`;

    const results = await runRace({
      participants: 20,

      operation: async () => {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          "Password123!",
        );

        return credential.user.email;
      },
    });

    expect(results.every((result) => !result.success)).toBe(true);

    const users = await admin.auth().listUsers(1000);

    const createdUsers = users.users.filter((user) => user.email === email);

    expect(createdUsers).toHaveLength(0);
  });
});
