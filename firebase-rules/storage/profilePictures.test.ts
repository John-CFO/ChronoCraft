/////////////////////////////////// profilePictures.test.ts //////////////////////////////

// This file contains the storage unit tests

//////////////////////////////////////////////////////////////////////////////////////////

import { afterEach, beforeEach, expect, test } from "vitest";
import { ref, uploadBytes } from "firebase/storage";

import { setupTestEnv } from "../testEnv";

//////////////////////////////////////////////////////////////////////////////////////////

// setup the test environment
let env: Awaited<ReturnType<typeof setupTestEnv>>;

// get a user context
const user = (uid: string) => env.authenticatedContext(uid);

beforeEach(async () => {
  env = await setupTestEnv();
});

afterEach(async () => {
  if (env) await env.cleanup();
});

/* =========================
   VALID CASES
========================= */

test("owner can upload own profile picture (min valid boundary)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  const validMin = new Uint8Array(1025); // just over 1024

  await expect(
    uploadBytes(fileRef, validMin, {
      contentType: "image/png",
    }),
  ).resolves.toBeDefined();
});

test("owner can overwrite existing profile picture", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  const initial = new Uint8Array(2048);
  const overwrite = new Uint8Array(4096);

  await uploadBytes(fileRef, initial, {
    contentType: "image/png",
  });

  await expect(
    uploadBytes(fileRef, overwrite, {
      contentType: "image/png",
    }),
  ).resolves.toBeDefined();
});

/* =========================
   SECURITY DENY CASES
========================= */

test("deny upload to another user's profile picture", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userB/current.jpg");

  await expect(
    uploadBytes(fileRef, new Uint8Array(1025), {
      contentType: "image/png",
    }),
  ).rejects.toBeTruthy();
});

test("deny upload below minimum size (1023 bytes)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  await expect(
    uploadBytes(fileRef, new Uint8Array(1023), {
      contentType: "image/png",
    }),
  ).rejects.toBeTruthy();
});

test("deny upload at exact minimum boundary (1024 bytes)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  await expect(
    uploadBytes(fileRef, new Uint8Array(1024), {
      contentType: "image/png",
    }),
  ).rejects.toBeTruthy();
});

test("deny upload above maximum size", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  await expect(
    uploadBytes(fileRef, new Uint8Array(5 * 1024 * 1024 + 1), {
      contentType: "image/png",
    }),
  ).rejects.toBeTruthy();
});

test("deny upload at exact maximum boundary (5MB)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  await expect(
    uploadBytes(fileRef, new Uint8Array(5 * 1024 * 1024), {
      contentType: "image/png",
    }),
  ).rejects.toBeTruthy();
});

test("deny non-image upload", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, "profilePictures/userA/current.jpg");

  await expect(
    uploadBytes(fileRef, new Uint8Array(4096), {
      contentType: "application/pdf",
    }),
  ).rejects.toBeTruthy();
});
