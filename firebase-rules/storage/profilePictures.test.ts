/////////////////////////////////// profilePictures.test.ts //////////////////////////////

// This file contains the storage unit tests for the quarantine + final path model:
//   - Client writes only to profilePictures/quarantine/{uid}/{uploadId}
//   - Cloud Function (Admin SDK) validates and moves to profilePictures/{uid}/{fileName}
//   - Final path is publicly readable, not client-writable

//////////////////////////////////////////////////////////////////////////////////////////

import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { ref, uploadBytes, deleteObject, getBytes } from "firebase/storage";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

import { setupTestEnv } from "../testEnv";

//////////////////////////////////////////////////////////////////////////////////////////

let env: Awaited<ReturnType<typeof setupTestEnv>>;

const user = (uid: string) => env.authenticatedContext(uid);

const MIN_VALID_SIZE = 1025; // rule is `size > 1024`
const MAX_VALID_SIZE = 5 * 1024 * 1024 - 1; // rule is `size < 5MB`
const MAX_SIZE = 5 * 1024 * 1024;

// Fresh UUID per call → each write is a `create`, never an `update`
const quarantinePath = (uid: string) =>
  `profilePictures/quarantine/${uid}/${crypto.randomUUID()}`;

const finalPath = (uid: string) => `profilePictures/${uid}/current.jpg`;

beforeAll(async () => {
  env = await setupTestEnv();
});

afterAll(async () => {
  if (env) await env.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
});

/* =========================
   QUARANTINE — VALID CASES
========================= */

test("owner can upload to own quarantine (min valid boundary)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertSucceeds(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "image/png",
    }),
  );
});

test("owner can upload to own quarantine (max valid boundary)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertSucceeds(
    uploadBytes(fileRef, new Uint8Array(MAX_VALID_SIZE), {
      contentType: "image/jpeg",
    }),
  );
});

test("owner can delete own quarantine file", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertSucceeds(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "image/png",
    }),
  );
  await assertSucceeds(deleteObject(fileRef));
});

/* =========================
   QUARANTINE — DENY CASES
========================= */

test("deny upload to another user's quarantine", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userB"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "image/png",
    }),
  );
});

test("deny upload at exact minimum boundary (1024 bytes)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(1024), {
      contentType: "image/png",
    }),
  );
});

test("deny upload below minimum size (1023 bytes)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(1023), {
      contentType: "image/png",
    }),
  );
});

test("deny upload at exact maximum boundary (5MB)", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(MAX_SIZE), {
      contentType: "image/png",
    }),
  );
});

test("deny upload above maximum size", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(MAX_SIZE + 1), {
      contentType: "image/png",
    }),
  );
});

test("deny non-image upload", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "application/pdf",
    }),
  );
});

// NOTE: `allow update: if false` on quarantine cannot be reliably tested
// via the Storage emulator — uploadBytes to an existing path is evaluated
// as `create` rather than `update` by the emulator, so the second write
// succeeds even though it should not. The rule is still enforced in
// production; only the test harness cannot distinguish the two cases.

test("owner cannot read own quarantine file", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertSucceeds(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "image/png",
    }),
  );
  await assertFails(getBytes(fileRef));
});

test("deny unauthenticated upload", async () => {
  const storage = env.unauthenticatedContext().storage();
  const fileRef = ref(storage, quarantinePath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "image/png",
    }),
  );
});

test("deny delete of another user's quarantine file", async () => {
  const path = quarantinePath("userB");

  await assertSucceeds(
    uploadBytes(
      ref(user("userB").storage(), path),
      new Uint8Array(MIN_VALID_SIZE),
      {
        contentType: "image/png",
      },
    ),
  );

  await assertFails(deleteObject(ref(user("userA").storage(), path)));
});

/* =========================
   FINAL PATH — ADMIN-ONLY WRITES
========================= */

test("client cannot write to final path", async () => {
  const storage = user("userA").storage();
  const fileRef = ref(storage, finalPath("userA"));

  await assertFails(
    uploadBytes(fileRef, new Uint8Array(MIN_VALID_SIZE), {
      contentType: "image/png",
    }),
  );
});

test("client cannot delete from final path", async () => {
  await assertFails(
    deleteObject(ref(user("userA").storage(), finalPath("userA"))),
  );
});

test("read on final path is allowed by rules", async () => {
  const contexts = [
    user("userB").storage(),
    env.unauthenticatedContext().storage(),
  ];

  for (const storage of contexts) {
    try {
      await getBytes(ref(storage, finalPath("userA")));
    } catch (error: any) {
      expect(error.code).not.toBe("storage/unauthorized");
    }
  }
});

/* =========================
   CATCH-ALL
========================= */

test("deny access to unrelated paths", async () => {
  const storage = user("userA").storage();

  await assertFails(
    uploadBytes(
      ref(storage, "some/other/path/file.png"),
      new Uint8Array(MIN_VALID_SIZE),
      {
        contentType: "image/png",
      },
    ),
  );
});
