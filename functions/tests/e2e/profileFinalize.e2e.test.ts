////////////////////////// profileFinalize.e2e.test.ts //////////////////////////

// This file contains the E2E tests for the profileFinalize function

///////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { callFunction, getIdTokenForUser, TEST_USERS } from "./setup";
import {
  unwrapBody,
  getEffectiveStatusCode,
} from "./trust-boundaries.e2e.test";

///////////////////////////////////////////////////////////////////////////////

// types

type CallResult = {
  status: number;
  body: any;
};

///////////////////////////////////////////////////////////////////////////////

// helpers
const getBucket = () => admin.storage().bucket();

const ensureStorageInit = async () => {
  const bucket = getBucket();
  await bucket
    .file(".init")
    .save("init")
    .catch(() => {});
};

const expectSuccess = (res: CallResult) => {
  const status = getEffectiveStatusCode(res);

  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(300);
};

const expectCallableError = (
  res: CallResult,
  expectedStatus: number,
  expectedCode?: string,
) => {
  const status = getEffectiveStatusCode(res);

  expect(status).toBe(expectedStatus);

  const body = unwrapBody(res.body);

  expect(body.error).toBeDefined();

  if (expectedCode) {
    expect(body.error.status).toBe(expectedCode);
  }
};

///////////////////////////////////////////////////////////////////////////////

describe("profileFinalize E2E", () => {
  // --------------------------------------------------------------------------
  // AUTH CONTRACT
  // --------------------------------------------------------------------------

  describe("authentication boundary", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        body: {
          displayName: "John",
        },
        isCallable: true,
      });

      expectCallableError(res, 401, "UNAUTHENTICATED");
    });
  });

  // --------------------------------------------------------------------------
  // INPUT CONTRACT
  // --------------------------------------------------------------------------

  describe("input validation boundary", () => {
    it("should reject empty finalize payload", async () => {
      const uid = TEST_USERS[0].uid;

      const idToken = await getIdTokenForUser(uid);

      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        idToken,
        body: {},
        isCallable: true,
      });

      expectCallableError(res, 400, "INVALID_ARGUMENT");
    });
  });

  // --------------------------------------------------------------------------
  // STORAGE OWNERSHIP CONTRACT
  // --------------------------------------------------------------------------

  describe("storage ownership boundary", () => {
    it("should reject foreign storage paths", async () => {
      const uid = TEST_USERS[0].uid;

      const idToken = await getIdTokenForUser(uid);

      const foreignPath = "profilePictures/another-user/temp/test.jpg";

      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        idToken,
        body: {
          path: foreignPath,
        },
        isCallable: true,
      });

      expectCallableError(res, 403, "PERMISSION_DENIED");
    });

    it("should reject missing temporary uploads", async () => {
      const uid = TEST_USERS[0].uid;

      const idToken = await getIdTokenForUser(uid);

      const missingPath = `profilePictures/${uid}/temp/missing-file.jpg`;

      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        idToken,
        body: {
          path: missingPath,
        },
        isCallable: true,
      });

      expectCallableError(res, 404, "NOT_FOUND");
    });
  });

  // --------------------------------------------------------------------------
  // PROFILE FINALIZATION CONTRACT
  // --------------------------------------------------------------------------

  describe("profile finalization flow", () => {
    it("should update profile without image upload", async () => {
      const uid = TEST_USERS[0].uid;

      const idToken = await getIdTokenForUser(uid);

      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        idToken,
        body: {
          displayName: "Updated Name",
          personalNumber: "12345",
        },
        isCallable: true,
      });

      expectSuccess(res);

      const body = unwrapBody(res.body);

      expect(body.success).toBe(true);

      expect(body.photoURL).toBeNull();
    });

    it("should finalize uploaded profile image", async () => {
      await ensureStorageInit();

      const uid = TEST_USERS[0].uid;
      const idToken = await getIdTokenForUser(uid);
      console.log(
        "Using storage emulator:",
        !!process.env.FIREBASE_STORAGE_EMULATOR_HOST,
      );
      const bucket = getBucket();
      console.log("Bucket name:", bucket.name);
      const tempPath = `profilePictures/${uid}/temp/test-image.jpg`;

      const tempFile = bucket.file(tempPath);

      await tempFile.save(Buffer.from("fake-image-content"), {
        resumable: false,
        metadata: { contentType: "image/jpeg" },
      });

      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        idToken,
        body: { path: tempPath, displayName: "John" },
        isCallable: true,
      });

      expectSuccess(res);

      const body = unwrapBody(res.body);

      expect(body.success).toBe(true);
      expect(body.photoURL).toBe(`profilePictures/${uid}/current.jpg`);

      const promotedFile = bucket.file(`profilePictures/${uid}/current.jpg`);

      const [exists] = await promotedFile.exists();
      expect(exists).toBe(true);

      const [tempExists] = await tempFile.exists();
      expect(tempExists).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // STORAGE METADATA CONTRACT
  // --------------------------------------------------------------------------

  describe("storage metadata integrity", () => {
    it("should set finalized metadata on promoted image", async () => {
      await ensureStorageInit();

      const uid = TEST_USERS[0].uid;
      const idToken = await getIdTokenForUser(uid);
      console.log(
        "Using storage emulator:",
        !!process.env.FIREBASE_STORAGE_EMULATOR_HOST,
      );
      const bucket = getBucket();
      console.log("Bucket name:", bucket.name);
      const tempPath = `profilePictures/${uid}/temp/meta-test.jpg`;

      const tempFile = bucket.file(tempPath);

      await tempFile.save(Buffer.from("meta-test"), {
        resumable: false,
        metadata: { contentType: "image/jpeg" },
      });

      const res = await callFunction({
        functionName: "profileFinalizeFunction",
        idToken,
        body: { path: tempPath },
        isCallable: true,
      });

      expectSuccess(res);

      const promotedFile = bucket.file(`profilePictures/${uid}/current.jpg`);

      const [metadata] = await promotedFile.getMetadata();

      expect(metadata.metadata).toBeDefined();
      expect(metadata.metadata?.finalized).toBe("true");
      expect(metadata.metadata?.owner).toBe(uid);
      expect(metadata.metadata?.finalizedAt).toBeDefined();
    });
  });
});
