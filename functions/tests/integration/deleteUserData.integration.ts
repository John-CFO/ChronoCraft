///////////////////////// deleteUserData.integration.ts ///////////////////////

// This file contains integration tests for the deleteUserData function

///////////////////////////////////////////////////////////////////////

// constants for test setup
const PROJECT_ID = "chrono-craft-worktime-manager";
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;

process.env.FIREBASE_CONFIG = JSON.stringify({
  storageBucket: BUCKET_NAME,
});
process.env.FUNCTIONS_STORAGE_BUCKET = BUCKET_NAME;

import { CallableRequest } from "firebase-functions/v2/https";

import { admin } from "../../tests/firebaseAdminTest";
import { deleteUserDataHandler } from "../../src/functions/deleteUserData.function";

///////////////////////////////////////////////////////////////////////

describe("deleteUserData Integration Test", () => {
  const uid = `test-user-${Date.now()}`;
  const db = admin.firestore();
  const bucket = admin.storage().bucket(BUCKET_NAME);
  const auth = admin.auth();
  const avatarPath = `profilePictures/${uid}/avatar.png`;

  beforeAll(async () => {
    await auth.createUser({
      uid,
      email: `${uid}@example.com`,
      password: "secret123",
    });
    await db.collection("Users").doc(uid).set({ name: "Test User" });
    await db
      .collection("mfa_totp")
      .doc(uid)
      .set({ type: "totp", enabled: true });
    await bucket.file(avatarPath).save("dummy content");
  });

  afterAll(async () => {
    try {
      await auth.deleteUser(uid);
    } catch {}
    try {
      await db.collection("Users").doc(uid).delete();
    } catch {}
    try {
      await db.collection("mfa_totp").doc(uid).delete();
    } catch {}
    try {
      await bucket.file(avatarPath).delete();
    } catch {}
  });

  it("should delete all user data", async () => {
    const req = {
      auth: { uid },
    } as CallableRequest;
    const result = await deleteUserDataHandler(req);
    expect(result).toEqual({ success: true });

    // Auth deleted? trhows error if user not found
    await expect(auth.getUser(uid)).rejects.toThrow(/no user record/i);

    expect((await db.collection("Users").doc(uid).get()).exists).toBe(false);
    expect((await db.collection("mfa_totp").doc(uid).get()).exists).toBe(false);
    expect((await db.collection("RateLimits_v2").doc(uid).get()).exists).toBe(
      false,
    );

    // delete files with prefix should result in empty array
    const [exists] = await bucket.file(avatarPath).exists();
    expect(exists).toBe(false);
  });
});
