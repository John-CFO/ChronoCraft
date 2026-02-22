//////////////////////////// userRepo.integration.ts /////////////////////////////

// Integration tests for UserRepo against Firestore emulator

//////////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { UserRepo } from "../../../src/repos/userRepo";
import { NotFoundError } from "../../../src/errors/domain.errors";

///////////////////////////////////////////////////////////////////////////////////////

// Init admin with projectId (important for emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "test-project",
  });
}

// Ensure emulator settings
const ensureFirestoreEmulatorForUserTests = () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run tests with `firebase emulators:exec`.",
    );
  }

  admin.firestore().settings({
    host: host.replace("http://", ""),
    ssl: false,
  });
};

ensureFirestoreEmulatorForUserTests();

describe("UserRepo Integration Tests", () => {
  let testUid: string;
  let userRepo: UserRepo;

  beforeAll(() => {
    userRepo = new UserRepo();
  });

  beforeEach(() => {
    testUid = `test-user-${Date.now()}-${Math.random()}`;
  });

  afterEach(async () => {
    await admin
      .firestore()
      .collection("Users")
      .doc(testUid)
      .delete()
      .catch(() => {
        /* ignore */
      });
  });

  it("should connect to Firestore Emulator", async () => {
    const firestore = admin.firestore();
    expect(typeof firestore.collection).toBe("function");

    const testRef = firestore.collection("test_connection").doc("test_doc");

    await testRef.set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const doc = await testRef.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.test).toBe(true);

    await testRef.delete();
  });

  describe("getUser", () => {
    it("should retrieve existing user", async () => {
      const userData = {
        email: "test@example.com",
        displayName: "Test User",
        totpSecret: "TEST_SECRET",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const firestore = admin.firestore();
      await firestore.collection("Users").doc(testUid).set(userData);

      const userDoc = await userRepo.getUser(testUid);
      const data = userDoc.data();

      expect(userDoc.exists).toBe(true);
      expect(data?.email).toBe(userData.email);
      expect(data?.displayName).toBe(userData.displayName);
      expect(data?.totpSecret).toBe(userData.totpSecret);
    });

    it("should throw NotFoundError for non-existent user", async () => {
      const nonExistentUid = "non-existent-user-12345";
      await expect(userRepo.getUser(nonExistentUid)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      const initialData = { email: "old@example.com" };
      const firestore = admin.firestore();
      await firestore.collection("Users").doc(testUid).set(initialData);

      const updateData = { email: "new@example.com", displayName: "Updated" };
      await userRepo.updateUser(testUid, updateData);

      const updatedDoc = await firestore.collection("Users").doc(testUid).get();
      const updatedData = updatedDoc.data();

      expect(updatedData?.email).toBe("new@example.com");
      expect(updatedData?.displayName).toBe("Updated");
    });
  });
});
