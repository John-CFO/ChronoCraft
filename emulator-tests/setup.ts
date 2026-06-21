////////////////////////////// setup.ts //////////////////////////////

// This file is used to set up the test environment for the emulator tests

//////////////////////////////////////////////////////////////////////

globalThis.performance ??= {
  now: () => Date.now(),
  markResourceTiming: () => {},
  clearResourceTimings: () => {},
} as any;

if (!globalThis.fetch) {
  throw new Error("global fetch not available");
}

///////////////////////////////////////////////////////////////////////

import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

///////////////////////////////////////////////////////////////////////

// define emulator host
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:5001";

// init app
const app = initializeApp({
  apiKey: "demo",
  authDomain: "demo",
  projectId: "chrono-craft-worktime-manager",
});

// init services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// connect emulators
connectAuthEmulator(auth, "http://127.0.0.1:5001");
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
  } catch {}

  try {
    await createUserWithEmailAndPassword(
      auth,
      TEST_USER.email,
      TEST_USER.password,
    );
  } catch (e: any) {
    if (e?.code !== "auth/email-already-in-use") {
      throw e;
    }
  }

  const cred = await signInWithEmailAndPassword(
    auth,
    TEST_USER.email,
    TEST_USER.password,
  );

  if (!cred.user) throw new Error("No auth user after setup");

  await new Promise((r) => setTimeout(r, 300));
  const user = auth.currentUser;
  if (!user) throw new Error("No auth user after setup");

  await setDoc(doc(db, "Users", user.uid), {
    totp: {
      enabled: false,
    },
    createdAt: new Date(),
  });
}
