////////////////////////////// setup.ts //////////////////////////////

// This file is used to set up the test environment for the emulator tests

//////////////////////////////////////////////////////////////////////

import fetch from "node-fetch";

if (!globalThis.fetch) {
  (globalThis as any).fetch = fetch;
}

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

///////////////////////////////////////////////////////////////////////

// define emulator host
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

// init firebase
const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        apiKey: "dummy",
        authDomain: "dummy",
        projectId: "chrono-craft-worktime-manager",
      });
// init auth and functions
export const auth = getAuth(app);
export const functions = getFunctions(app);

connectAuthEmulator(auth, "http://127.0.0.1:9099");
connectFunctionsEmulator(functions, "127.0.0.1", 4001);
// init test user
export const TEST_USER = {
  email: "testuser@local.test",
  password: "Test1234!",
};

// function to ensure that the test user is logged in
export async function ensureTestUser() {
  try {
    await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
  } catch {
    await createUserWithEmailAndPassword(
      auth,
      TEST_USER.email,
      TEST_USER.password,
    );
    await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
  }
}
