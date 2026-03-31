//////////////////////////////// setup.ts ///////////////////////////////////

// This file contains the setup for the end-to-end tests

/////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import fs from "fs";
import path from "path";

/////////////////////////////////////////////////////////////////////////////////

// Jest Timeout (E2E needs more time
jest.setTimeout(300000);

/////////////////////////////////////////////////////////////////////////////////
// Admin SDK Setup

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "chrono-craft-worktime-manager",
  });
}

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (emulatorHost) {
  const host = emulatorHost.replace("http://", "");
  admin.firestore().settings({
    host,
    ssl: false,
  });
}

// Rate-limits lenient
process.env.RL_UID_MAX_ATTEMPTS = process.env.RL_UID_MAX_ATTEMPTS ?? "1000";
process.env.RL_IP_MAX_ATTEMPTS = process.env.RL_IP_MAX_ATTEMPTS ?? "1000";
process.env.RL_DEVICE_KNOWN_MAX = process.env.RL_DEVICE_KNOWN_MAX ?? "1000";
process.env.RL_DEVICE_UNKNOWN_MAX = process.env.RL_DEVICE_UNKNOWN_MAX ?? "1000";
process.env.RL_UID_WINDOW_MS =
  process.env.RL_UID_WINDOW_MS ?? String(60 * 60 * 1000);
process.env.RL_IP_WINDOW_MS =
  process.env.RL_IP_WINDOW_MS ?? String(60 * 60 * 1000);

// fuctions to initialize the test environment
export const FUNCTIONS_EMULATOR_ORIGIN =
  process.env.FUNCTIONS_EMULATOR_ORIGIN || "http://localhost:4001";

export const PROJECT_ID =
  process.env.GCLOUD_PROJECT || "chrono-craft-worktime-manager";
export const REGION = process.env.FUNCTIONS_REGION || "us-central1";

// function to reset rate limit state
export const resetRateLimitState = async (_uid: string) => {
  const db = admin.firestore();

  for (const scope of ["uid", "ip", "device"] as const) {
    await db
      .recursiveDelete(db.collection("RateLimits").doc(scope))
      .catch(() => {});
  }
};

// interface for test users
export interface TestUser {
  uid: string;
  email: string;
  displayName: string;
}

// declare test users
export const TEST_USERS: TestUser[] = [
  {
    uid: "user1",
    email: "user1@example.com",
    displayName: "Test User 1",
  },
  {
    uid: "user2",
    email: "user2@example.com",
    displayName: "Test User 2",
  },
];

/////////////////////////////////////////////////////////////////////////////////
// Rules Unit Testing Setup

export let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const emulatorHost =
    process.env.FIRESTORE_EMULATOR_HOST ||
    `${process.env.TEST_FIRESTORE_HOST || "127.0.0.1"}:${
      process.env.TEST_FIRESTORE_PORT || "8001"
    }`;

  const [HOST, PORT_STR] = emulatorHost.replace("http://", "").split(":");
  const PORT = Number(PORT_STR);

  const candidatePaths = [
    path.resolve(__dirname, "../../../firestore.rules"),
    path.resolve(__dirname, "../../firestore.rules"),
    path.resolve(process.cwd(), "firestore.rules"),
    path.resolve(process.cwd(), "rules", "firestore.rules"),
  ];

  let rulesPath: string | null = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      rulesPath = p;
      break;
    }
  }

  if (!rulesPath) {
    throw new Error(
      `firestore.rules not found. Tried: ${candidatePaths.join(", ")}.`,
    );
  }

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: HOST,
      port: PORT,
      rules: fs.readFileSync(rulesPath, "utf8"),
    },
  });

  process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORT}`;

  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:5001";
  }

  // Seed initial test data (clean & deterministic)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    for (const user of TEST_USERS) {
      await db.collection("Users").doc(user.uid).set({
        displayName: user.displayName,
        email: user.email,
      });
    }

    await db.collection("Projects").doc("testProject1").set({
      name: "Test Project 1",
      userId: TEST_USERS[0].uid,
      createdAt: new Date(),
    });

    await db.collection("Projects").doc("testProject2").set({
      name: "Test Project 2",
      userId: TEST_USERS[1].uid,
      createdAt: new Date(),
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    try {
      await testEnv.clearFirestore();
    } catch {}
    try {
      await testEnv.cleanup();
    } catch {}
  }
});

/////////////////////////////////////////////////////////////////////////////////
// Helper Functions

const getAuthEmulatorHost = () => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!host) throw new Error("FIREBASE_AUTH_EMULATOR_HOST is not set.");
  return host;
};

const fetchIdTokenForUid = async (uid: string): Promise<string> => {
  const host = getAuthEmulatorHost();
  const url = `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=any`;

  const customToken = await admin.auth().createCustomToken(uid);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });

  if (!res.ok)
    throw new Error(`Failed to get idToken: ${res.status} ${await res.text()}`);

  const json = await res.json();
  return json.idToken;
};

export const getIdTokenForUser = fetchIdTokenForUid;

export const setupTestData = async () => {
  const auth = admin.auth();
  const db = admin.firestore();

  for (const user of TEST_USERS) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
    } catch {}

    await db.collection("Users").doc(user.uid).set({
      email: user.email,
      displayName: user.displayName,
    });
  }

  await db.collection("Projects").doc("testProject1").set({
    name: "Test Project 1",
    userId: TEST_USERS[0].uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("Projects").doc("testProject2").set({
    name: "Test Project 2",
    userId: TEST_USERS[1].uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

export const cleanupTestData = async () => {
  const auth = admin.auth();
  const db = admin.firestore();

  const usersSnapshot = await db.collection("Users").get();
  await Promise.all(usersSnapshot.docs.map((d) => d.ref.delete()));

  const projectsSnapshot = await db.collection("Projects").get();
  await Promise.all(projectsSnapshot.docs.map((d) => d.ref.delete()));

  for (const user of TEST_USERS) {
    try {
      await auth.deleteUser(user.uid);
    } catch {}
  }
};

export const resetTotpState = async (uid: string) => {
  const db = admin.firestore();

  //delets MFA-fields in Users document directly
  await db.collection("Users").doc(uid).set(
    {
      totp: admin.firestore.FieldValue.delete(),
      totpEnrollment: admin.firestore.FieldValue.delete(),
    },
    { merge: true },
  );
  // delets MFA document in mfa_totp collection
  await db
    .collection("mfa_totp")
    .doc(uid)
    .delete()
    .catch(() => {});

  // delets pending Enrollments
  const pending = await db
    .collection("mfa_totp_pending")
    .where("uid", "==", uid)
    .get();

  await Promise.all(pending.docs.map((d) => d.ref.delete()));
};

export const getTestTotpSecret = async (uid: string) => {
  const doc = await admin.firestore().collection("Users").doc(uid).get();
  return doc.data()?.totp?.secret ?? null;
};

export const callFunction = async ({
  functionName,
  body,
  idToken,
  isCallable = true,
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

  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const payload = isCallable ? { data: body } : body;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  let json;
  const text = await res.text();

  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, body: json };
};
