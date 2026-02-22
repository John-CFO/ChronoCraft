///////////////////////////// setup.ts /////////////////////////////////////

// This file contains the setup for the end-to-end tests.

/////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

/////////////////////////////////////////////////////////////////////////////////

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "test-project",
  });
}

if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.firestore().settings({
    host: process.env.FIRESTORE_EMULATOR_HOST.replace("http://", ""),
    ssl: false,
  });
}

export const FUNCTIONS_EMULATOR_ORIGIN =
  process.env.FUNCTIONS_EMULATOR_ORIGIN || "http://localhost:4001";

export const PROJECT_ID = process.env.GCLOUD_PROJECT || "test-project";
export const REGION = process.env.FUNCTIONS_REGION || "us-central1";

export interface TestUser {
  uid: string;
  email: string;
  displayName: string;
  totpSecret: string;
}

export const TEST_USERS: TestUser[] = [
  {
    uid: "user1",
    email: "user1@example.com",
    displayName: "Test User 1",
    totpSecret: "",
  },
  {
    uid: "user2",
    email: "user2@example.com",
    displayName: "Test User 2",
    totpSecret: "",
  },
];

//////////////////////////////////////////////////////////////////////////

// helper to get idToken from Auth Emulator
const getAuthEmulatorHost = () => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host) {
    throw new Error(
      "FIREBASE_AUTH_EMULATOR_HOST is not set. Run tests with firebase emulators:exec",
    );
  }
  return host;
};

// fetch idToken from emulator
const fetchIdTokenForUid = async (uid: string): Promise<string> => {
  const host = getAuthEmulatorHost();
  const url = `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=any`;

  const customToken = await admin.auth().createCustomToken(uid);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to get idToken from emulator: ${res.status} ${text}`,
    );
  }

  const json = await res.json();
  return json.idToken;
};

// function to setup test data
export const setupTestData = async () => {
  const auth = admin.auth();
  const usersRef = admin.firestore().collection("Users");

  for (const user of TEST_USERS) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
    } catch {
      // ignore if exists
    }

    await usersRef.doc(user.uid).set({
      email: user.email,
      displayName: user.displayName,
      totp: {
        secret: "dummySecret",
        enabled: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }

  await admin.firestore().collection("Projects").doc("testProject1").set({
    name: "Test Project 1",
    ownerId: TEST_USERS[0].uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await admin.firestore().collection("Projects").doc("testProject2").set({
    name: "Test Project 2",
    ownerId: TEST_USERS[1].uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

// Helper to get the TOTP secret for a user
export const getTestTotpSecret = async (uid: string) => {
  const doc = await admin.firestore().collection("Users").doc(uid).get();
  return doc.data()?.totp?.secret ?? null;
};

export const cleanupTestData = async () => {
  const auth = admin.auth();
  const usersRef = admin.firestore().collection("Users");
  const projectsRef = admin.firestore().collection("Projects");

  const usersSnapshot = await usersRef.get();
  await Promise.all(usersSnapshot.docs.map((d) => d.ref.delete()));

  const projectsSnapshot = await projectsRef.get();
  await Promise.all(projectsSnapshot.docs.map((d) => d.ref.delete()));

  for (const user of TEST_USERS) {
    try {
      await auth.deleteUser(user.uid);
    } catch {
      // ignore
    }
  }
};

// Helper to get the idToken for a user
export const getIdTokenForUser = async (uid: string): Promise<string> => {
  return fetchIdTokenForUid(uid);
};

// Call a Gen2 HTTP function (or callable fallback).
export const callFunction = async ({
  functionName,
  body,
  idToken,
  isCallable = false,
}: {
  functionName: string;
  body: any;
  idToken?: string;
  isCallable?: boolean;
}) => {
  const url = `${FUNCTIONS_EMULATOR_ORIGIN}/${PROJECT_ID}/${REGION}/${functionName}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  const payload = isCallable ? { data: body } : body;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, body: json };
};
