//////////////////// validateProfileImage.integration.ts /////////////////////////////

// Integration tests for validateProfileImage Cloud Function
// against Firestore + Storage emulator.

//////////////////////////////////////////////////////////////////////////////////////

import { admin } from "../firebaseAdminTest";
import { validateProfileImageHandler } from "../../src/functions/validateProfileImage.function";

///////////////////////////////////////////////////////////////////////////////////////

// Ensure emulator settings — Firestore wie in deinen Repo-Tests,
// extra Storage-Emulator checks.
const ensureEmulators = () => {
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!firestoreHost) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run tests with `firebase emulators:exec`.",
    );
  }

  const storageHost = process.env.STORAGE_EMULATOR_HOST;
  if (!storageHost) {
    throw new Error(
      "STORAGE_EMULATOR_HOST is not set. Run tests with `firebase emulators:exec --only ...storage`.",
    );
  }

  admin.firestore().settings({
    host: firestoreHost.replace("http://", ""),
    ssl: false,
  });
};

ensureEmulators();

//////////////////////////////////////////////////////////////////////////////////////////

// Valid JPEG, > 1024 bytes, so that it passes the size check.
// Header: SOI + APP0 JFIF, Body: Padding, Tail: EOI.
const VALID_JPEG = (() => {
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
  ]);
  const body = Buffer.alloc(2000, 0x00);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, body, eoi]);
})();

const BUCKET = "demo-test.firebasestorage.app";

describe("validateProfileImage Integration Tests", () => {
  let testUid: string;
  let bucket: ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

  beforeAll(() => {
    bucket = admin.storage().bucket(BUCKET);
  });

  beforeEach(() => {
    testUid = `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  afterEach(async () => {
    // delete Firestore-user
    await admin
      .firestore()
      .collection("Users")
      .doc(testUid)
      .delete()
      .catch(() => {
        /* ignore */
      });

    // Quarantine + clean up final path
    const prefixes = [
      `profilePictures/quarantine/${testUid}/`,
      `profilePictures/${testUid}/`,
    ];
    for (const prefix of prefixes) {
      const [files] = await bucket.getFiles({ prefix });
      await Promise.all(
        files.map((f) =>
          f.delete().catch(() => {
            /* ignore */
          }),
        ),
      );
    }
  });

  // Sanity check: Is the storage emulator accessible via the Admin SDK?
  it("should connect to Storage Emulator", async () => {
    const testFile = bucket.file("test/sanity.txt");
    await testFile.save(Buffer.from("hello"));
    const [exists] = await testFile.exists();
    expect(exists).toBe(true);
    await testFile.delete();
  });

  // Handler-Sanity: valid JPEG → final file + Firestore-Update
  it("should promote a valid JPEG and write photoURL", async () => {
    const firestore = admin.firestore();
    await firestore.collection("Users").doc(testUid).set({
      displayName: "Test",
    });

    const quarantinePath = `profilePictures/quarantine/${testUid}/test-upload`;
    await bucket.file(quarantinePath).save(VALID_JPEG, {
      metadata: { contentType: "image/jpeg" },
    });

    await validateProfileImageHandler({
      data: {
        name: quarantinePath,
        bucket: BUCKET,
        size: String(VALID_JPEG.length),
        contentType: "image/jpeg",
      } as any,
    });

    // Finale file exists
    const [finalExists] = await bucket
      .file(`profilePictures/${testUid}/current.jpg`)
      .exists();
    expect(finalExists).toBe(true);

    // Quarantine is deleted
    const [quarantineExists] = await bucket.file(quarantinePath).exists();
    expect(quarantineExists).toBe(false);

    // Firestore has photoURL with Cache-Buster
    const userSnap = await firestore.collection("Users").doc(testUid).get();
    const photoURL = userSnap.data()?.photoURL as string;
    expect(photoURL).toContain("current.jpg");
    expect(photoURL).toMatch(/v=\d+/);
  });

  it("should reject path traversal in uid segment", async () => {
    const firestore = admin.firestore();
    await firestore.collection("Users").doc(testUid).set({
      displayName: "Test",
    });

    // Attack-Path: 4 segments, but uid = ".."
    const maliciousPath = "profilePictures/quarantine/../evil";
    await bucket.file(maliciousPath).save(VALID_JPEG, {
      metadata: { contentType: "image/jpeg" },
    });

    await validateProfileImageHandler({
      data: {
        name: maliciousPath,
        bucket: BUCKET,
        size: String(VALID_JPEG.length),
        contentType: "image/jpeg",
      } as any,
    });

    // Expect: no file created outside profilePictures/{valid-uid}/,
    // no Firestore document with uid ".." created.
    const [rootCurrent] = await bucket
      .file("profilePictures/current.jpg")
      .exists();
    expect(rootCurrent).toBe(false);

    // The test user's user document must not have been modified.
    const userSnap = await firestore.collection("Users").doc(testUid).get();
    expect(userSnap.data()?.photoURL).toBeUndefined();
  });

  // Non-Images with Image-Content-Type
  it.each([
    {
      name: "pdf",
      bytes: Buffer.concat([
        Buffer.from("%PDF-1.7\n"),
        Buffer.alloc(2000, 0x00),
      ]),
    },
    {
      name: "html",
      bytes: Buffer.concat([
        Buffer.from("<!doctype html><html>"),
        Buffer.alloc(2000, 0x00),
      ]),
    },
    {
      name: "gif",
      bytes: Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(2000, 0x00)]),
    },
    {
      name: "zip",
      bytes: Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.alloc(2000, 0x00),
      ]),
    },
    {
      name: "plaintext",
      bytes: Buffer.concat([
        Buffer.from("not an image at all"),
        Buffer.alloc(2000, 0x00),
      ]),
    },
  ])(
    "should reject $name even with image/jpeg content type",
    async ({ name, bytes }) => {
      const firestore = admin.firestore();
      await firestore.collection("Users").doc(testUid).set({
        displayName: "Test",
      });

      const quarantinePath = `profilePictures/quarantine/${testUid}/${name}`;
      await bucket.file(quarantinePath).save(bytes);

      await validateProfileImageHandler({
        data: {
          name: quarantinePath,
          bucket: BUCKET,
          size: String(bytes.length),
          contentType: "image/jpeg", // ←  a lie
        } as any,
      });

      // Quarantine files is deleted
      const [quarantineExists] = await bucket.file(quarantinePath).exists();
      expect(quarantineExists).toBe(false);

      // No final file created
      const [finalExists] = await bucket
        .file(`profilePictures/${testUid}/current.jpg`)
        .exists();
      expect(finalExists).toBe(false);

      // No Firestore-Update
      const userSnap = await firestore.collection("Users").doc(testUid).get();
      expect(userSnap.data()?.photoURL).toBeUndefined();
    },
  );

  // Path-Filter (S1)
  it.each([
    {
      label: "no quarantine prefix",
      path: `profilePictures/${"uid"}/current.jpg`,
    },
    { label: "too few segments", path: "profilePictures/quarantine/onlythree" },
    {
      label: "too many segments",
      path: "profilePictures/quarantine/uid/file/extra",
    },
    { label: "only prefix", path: "profilePictures/quarantine" },
    { label: "wrong prefix", path: "Quarantine/uid/file" },
  ])("should ignore $label: $path", async ({ path }) => {
    // Create file at the attacker path (in the emulator, to bypass rules)
    await bucket.file(path).save(VALID_JPEG, {
      metadata: { contentType: "image/jpeg" },
    });

    await validateProfileImageHandler({
      data: {
        name: path,
        bucket: BUCKET,
        size: String(VALID_JPEG.length),
        contentType: "image/jpeg",
      } as any,
    });

    // File remains unchanged — the function did nothing to it
    const [exists] = await bucket.file(path).exists();
    expect(exists).toBe(true);
  });
});
