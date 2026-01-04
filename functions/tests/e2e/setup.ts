////////////////////////////////// setup.ts /////////////////////////////////////

// This file contains the setup for the end-to-end tests.

/////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import firebaseFunctionsTest from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";

import {
  authValidator,
  profileValidator,
  projectsAndWorkValidator,
  secureDelete,
} from "../../src/index";

/////////////////////////////////////////////////////////////////////////////////

// Firebase-Admin-initialization
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "test-project",
  });
}

// ensures that firestore returns a function to the emulator
const firestore = admin.firestore();

// Export for tests
export { admin, firestore };

// Typedefinition
interface TestUser {
  uid: string;
  email: string;
  displayName: string;
  totpSecret: string;
}

// expanded JWT-Interface
interface JWT extends admin.auth.DecodedIdToken {
  header: {
    alg: string;
    kid: string;
    typ: string;
  };
}

//////////////////////////////////////////////////////////////////////////////////

// Initialize the Firebase Functions Test-Framework
const testEnv = firebaseFunctionsTest({
  projectId: "your-project-id",
});

const wrapped = testEnv.wrap(authValidator);

// Dummy-Data
const TEST_USERS: TestUser[] = [
  {
    uid: "user1",
    email: "user1@example.com",
    displayName: "Test User 1",
    totpSecret: "secret1",
  },
  {
    uid: "user2",
    email: "user2@example.com",
    displayName: "Test User 2",
    totpSecret: "secret2",
  },
];

// Dummy Token for Auth
const fakeToken = (user: TestUser): JWT => ({
  header: {
    alg: "RS256",
    kid: "fakekid",
    typ: "JWT",
  },
  payload: {
    aud: "your-project-id",
    auth_time: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    firebase: {
      identities: {
        email: [user.email],
      },
      sign_in_provider: "password",
    },
    iat: Math.floor(Date.now() / 1000),
    iss: "https://securetoken.google.com/your-project-id",
    sub: user.uid,
    uid: user.uid,
  },
  aud: "your-project-id",
  auth_time: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  firebase: {
    identities: {
      email: [user.email],
    },
    sign_in_provider: "password",
  },
  iat: Math.floor(Date.now() / 1000),
  iss: "https://securetoken.google.com/your-project-id",
  sub: user.uid,
  uid: user.uid,
});

// Helper-Function to create a CallableRequest object
export const createMockCallableRequest = (
  user: TestUser,
  data: any
): CallableRequest<typeof data> => {
  return {
    data,
    auth: {
      uid: user.uid,
      token: fakeToken(user),
    },
    instanceIdToken: undefined,
    app: undefined,
    rawRequest: {
      headers: {
        "content-type": "application/json",
      },
      body: {},
      rawBody: Buffer.from(JSON.stringify(data)),
      query: {},
      params: {},
      method: "POST",
      url: "/",
      get: (header: string) => {
        if (header === "Content-Type") return "application/json";
        return undefined;
      },
      header: (header: string) => {
        if (header === "Content-Type") return "application/json";
        return undefined;
      },
      accepts: () => "application/json",
    } as any, // used any for rawRequest, as we don't implement the full Express Request interface
  };
};

// Setup-Function
const setupTestData = async () => {
  const usersRef = admin.firestore().collection("Users");
  const auth = admin.auth();

  for (const user of TEST_USERS) {
    // call createUser
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
    } catch (error) {
      console.log(`User ${user.uid} already exists or error occured:`, error);
    }

    // Save user data in Firestore
    await usersRef.doc(user.uid).set({
      email: user.email,
      displayName: user.displayName,
      totpSecret: user.totpSecret,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // create a complete CallableRequest-Object
    const mockRequest = createMockCallableRequest(user, {
      action: "register",
      payload: user,
    });

    // call the Callable-Function
    try {
      const result = await wrapped(mockRequest);
      console.log("Function call success:", result);
    } catch (error) {
      console.error("Error by function call:", error);
    }
  }

  // Project setups
  const projectsRef = admin.firestore().collection("Projects");
  await projectsRef.doc("testProject1").set({
    name: "Test Project 1",
    ownerId: TEST_USERS[0].uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await projectsRef.doc("testProject2").set({
    name: "Test Project 2",
    ownerId: TEST_USERS[1].uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("Test data successfully setup.");
};

// clear the test data
const cleanupTestData = async () => {
  const auth = admin.auth();
  const usersRef = admin.firestore().collection("Users");
  const projectsRef = admin.firestore().collection("Projects");

  const usersSnapshot = await usersRef.get();
  const deleteUsers = usersSnapshot.docs.map((doc) => doc.ref.delete());

  const projectsSnapshot = await projectsRef.get();
  const deleteProjects = projectsSnapshot.docs.map((doc) => doc.ref.delete());

  await Promise.all([...deleteUsers, ...deleteProjects]);

  for (const user of TEST_USERS) {
    // call deleteUser
    try {
      await auth.deleteUser(user.uid);
    } catch (error) {
      console.log(`User ${user.uid} could not be deleted:`, error);
    }
  }

  console.log("Test data successfully cleaned up.");
};

export {
  TEST_USERS,
  setupTestData,
  cleanupTestData,
  authValidator,
  profileValidator,
  projectsAndWorkValidator,
  secureDelete,
};
