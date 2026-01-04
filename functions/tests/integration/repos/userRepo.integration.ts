/////////////////////////// userRepo.integration.ts /////////////////////////////

// THis file contains the integration tests for the UserRepo class,
// which is used to interact with the Firestore database.

//////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import { UserRepo } from "../../../src/repos/userRepo";
import { NotFoundError } from "../../../src/errors/domain.errors";

//////////////////////////////////////////////////////////////////////////////////

describe("UserRepo Integration Tests", () => {
  let userRepo: UserRepo;
  let testUid: string;

  // check if Firebase is initialized
  beforeAll(() => {
    console.log("🧪 Starting Integration Tests");

    // Sensure that Firebase admin is initialized
    if (!admin.apps.length) {
      console.error("❌ Firebase Admin NOT initialized!");
      throw new Error(
        "Firebase Admin not initialized. Check integration.setup.ts"
      );
    }

    userRepo = new UserRepo();
  });

  beforeEach(() => {
    testUid = `test-user-${Date.now()}-${Math.random()}`;
    console.log(`🧪 Test UID: ${testUid}`);
  });

  afterEach(async () => {
    // clear: delete test data
    try {
      const firestore = admin.firestore();
      await firestore.collection("Users").doc(testUid).delete();
    } catch (error) {
      // ignore error, if doc is not existing
    }
  });

  // Test Firebase connection
  it("should connect to Firestore Emulator", async () => {
    const firestore = admin.firestore();

    // Debug: test Firestore-Instanz
    console.log("🔥 Firestore instance:", !!firestore);

    // Test if firestore.collection exists
    expect(typeof firestore.collection).toBe("function");

    const testRef = firestore.collection("test_connection").doc("test_doc");

    // write test data
    await testRef.set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Firestore write successful");

    // read test data
    const doc = await testRef.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.test).toBe(true);

    console.log("✅ Firestore read successful");

    // delete test data
    await testRef.delete();
    console.log("✅ Firestore delete successful");
  });

  describe("getUser", () => {
    it("should retrieve existing user", async () => {
      // Arrange
      const userData = {
        email: "test@example.com",
        displayName: "Test User",
        totpSecret: "TEST_SECRET",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      console.log(`📝 Write test data for ${testUid}`);

      // write direct with Firestore
      const firestore = admin.firestore();
      await firestore.collection("Users").doc(testUid).set(userData);
      console.log("✅ Test data written successfully");

      // Act
      const userDoc = await userRepo.getUser(testUid);
      const data = userDoc.data();

      // Assert
      expect(userDoc.exists).toBe(true);
      expect(data?.email).toBe(userData.email);
      expect(data?.displayName).toBe(userData.displayName);
      expect(data?.totpSecret).toBe(userData.totpSecret);
    });

    it("should throw NotFoundError for non-existent user", async () => {
      const nonExistentUid = "non-existent-user-12345";
      await expect(userRepo.getUser(nonExistentUid)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      // Arrange
      const initialData = { email: "old@example.com" };
      const firestore = admin.firestore();
      await firestore.collection("Users").doc(testUid).set(initialData);

      // Act
      const updateData = { email: "new@example.com", displayName: "Updated" };
      await userRepo.updateUser(testUid, updateData);

      // Assert
      const updatedDoc = await firestore.collection("Users").doc(testUid).get();
      const updatedData = updatedDoc.data();

      expect(updatedData?.email).toBe("new@example.com");
      expect(updatedData?.displayName).toBe("Updated");
    });
  });
});
