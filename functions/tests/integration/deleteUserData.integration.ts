///////////////////////// deleteUserData.integration.ts ///////////////////////

// This file contains integration tests for the deleteUserData function

///////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

import { deleteUserDataHandler } from "../../src/functions/deleteUserData.function";

///////////////////////////////////////////////////////////////////////

// constants for test setup
const PROJECT_ID = "chrono-craft-worktime-manager";
const BUCKET_NAME = `${PROJECT_ID}.appspot.com`;

// init admin with test config
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: BUCKET_NAME,
  });
}

describe("deleteUserData Integration Test", () => {
  const uid = `test-user-${Date.now()}`;
  const db = admin.firestore();
  const bucket = admin.storage().bucket(BUCKET_NAME);
  const auth = admin.auth();

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
    await bucket
      .file(`profilePictures/${uid}/avatar.png`)
      .save("dummy content");
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
      await bucket.file(`profilePictures/${uid}/avatar.png`).delete();
    } catch {}
  });

  it("should delete all user data", async () => {
    const req = { auth: { uid }, data: {} } as CallableRequest;
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
    const [files] = await bucket.getFiles({
      prefix: `profilePictures/${uid}/`,
    });
    expect(files.length).toBe(0);
  });
});
