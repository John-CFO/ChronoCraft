//////////////////////////////// setup.ts ///////////////////////////////////

// This file contains the setup for the end-to-end tests

/////////////////////////////////////////////////////////////////////////////////
console.log("[E2E] setup.ts loaded");
console.log("[E2E] ENV CHECK", {
  NODE_ENV: process.env.NODE_ENV,
  GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  FUNCTIONS_EMULATOR_ORIGIN: process.env.FUNCTIONS_EMULATOR_ORIGIN,
  CI: process.env.CI,
});
// Emulator configuration to point to local emulator when running e2e tests
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

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

// interface for test users
export interface TestUser {
  uid: string;
  email: string;
  displayName: string;
}

/////////////////////////////////////////////////////////////////////////////////

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

// Admin SDK Setup
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  });
}

// ensure firestore points to emulator
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8001";

const host = emulatorHost.replace("http://", "");

admin.firestore().settings({
  host,
  ssl: false,
});

// function to reset rate limit state
export const resetRateLimitState = async (_uid: string) => {
  const db = admin.firestore();

  for (const scope of ["uid", "ip", "device"] as const) {
    await db
      .recursiveDelete(db.collection("RateLimits").doc(scope))
      .catch(() => {});
  }
};

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
  console.log("[E2E] beforeAll START");
  console.log("[E2E] emulatorHost raw:", process.env.FIRESTORE_EMULATOR_HOST);

  const emulatorHost =
    process.env.FIRESTORE_EMULATOR_HOST ||
    `${process.env.TEST_FIRESTORE_HOST || "127.0.0.1"}:${
      process.env.TEST_FIRESTORE_PORT || "8001"
    }`;

  const [HOST, PORT_STR] = emulatorHost.replace("http://", "").split(":");
  const PORT = Number(PORT_STR);

  console.log("[E2E] parsed emulator host:", HOST, PORT);

  const rulesPath = path.resolve(
    __dirname,
    "../../../firebase-rules/firestore.rules",
  );
  console.log("[E2E] firestore rules path:", rulesPath);
  console.log("[E2E] rules exists:", fs.existsSync(rulesPath));

  if (!fs.existsSync(rulesPath)) {
    throw new Error(`firestore.rules not found at ${rulesPath}`);
  }

  console.log("[E2E] initializing test environment...");
  const start = Date.now();

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: HOST,
      port: PORT,
      rules: fs.readFileSync(rulesPath, "utf8"),
    },
  });

  console.log("[E2E] test environment ready in ms:", Date.now() - start);

  process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORT}`;

  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:5001";
  }

  console.log("[E2E] seeding test data start");
  // Seed initial test data (clean & deterministic)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    console.log("[E2E] seeding users...");
    for (const user of TEST_USERS) {
      await db.collection("Users").doc(user.uid).set({
        displayName: user.displayName,
        email: user.email,
      });
    }
    console.log("[E2E] seeding services...");
    await db
      .collection("Users")
      .doc(TEST_USERS[0].uid)
      .collection("Services")
      .doc("test-service")
      .set({ name: "Test Service" });

    await db
      .collection("Users")
      .doc(TEST_USERS[1].uid)
      .collection("Services")
      .doc("test-service")
      .set({ name: "Test Service" });
  });
  console.log("[E2E] seeding done");
  console.log("[E2E] beforeAll DONE");
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
  console.log("[E2E] fetchIdTokenForUid", uid);
  console.log("[E2E] auth emulator host:", host);
  const customToken = await admin.auth().createCustomToken(uid);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  console.log("[E2E] idToken received for:", uid);
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

  for (const user of TEST_USERS) {
    try {
      await auth.deleteUser(user.uid);
    } catch {}
  }
};

export const resetTotpState = async (uid: string) => {
  console.log("[E2E][resetTotpState][START]", { uid });

  const db = admin.firestore();

  console.log("[E2E][resetTotpState] deleting Users MFA fields", { uid });

  // deletes MFA-fields in Users document directly
  await db.collection("Users").doc(uid).set(
    {
      totp: admin.firestore.FieldValue.delete(),
      totpEnrollment: admin.firestore.FieldValue.delete(),
    },
    { merge: true },
  );

  console.log("[E2E][resetTotpState] mfa_totp delete start", { uid });

  // deletes MFA document in mfa_totp collection
  await db
    .collection("mfa_totp")
    .doc(uid)
    .delete()
    .catch((err) => {
      console.log("[E2E][resetTotpState] mfa_totp delete error", {
        uid,
        err: err?.message ?? err,
      });
    });

  console.log("[E2E][resetTotpState] mfa_totp delete done", { uid });

  console.log("[E2E][resetTotpState] pending query start", { uid });

  // deletes pending Enrollments
  const pending = await db
    .collection("mfa_totp_pending")
    .where("uid", "==", uid)
    .get();

  console.log("[E2E][resetTotpState] pending count", {
    uid,
    size: pending.size,
  });

  await Promise.all(pending.docs.map((d) => d.ref.delete()));

  console.log("[E2E][resetTotpState] pending delete done", { uid });
  console.log("[E2E][resetTotpState][END]", { uid });
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
  console.log("[E2E][callFunction][REQUEST]", {
    functionName,
    hasToken: !!idToken,
    isCallable,
    url: `${FUNCTIONS_EMULATOR_ORIGIN}/${PROJECT_ID}/${REGION}/${functionName}`,
  });
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  let json;
  const text = await res.text();
  console.log("[E2E][callFunction][RAW RESPONSE]", {
    functionName,
    status: res.status,
    raw: text?.slice?.(0, 500),
  });
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  console.log("[E2E][callFunction][PARSED RESPONSE]", {
    functionName,
    status: res.status,
    type: typeof json,
    bodyPreview: typeof json === "string" ? json.slice(0, 300) : json,
  });
  return { status: res.status, body: json };
};
