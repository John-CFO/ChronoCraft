//////////////////////// setup.ts (E2E) ////////////////////////////

//  This file contains the setup for the E2E tests

////////////////////////////////////////////////////////////////////

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

////////////////////////////////////////////////////////////////////

const app = initializeApp({
  apiKey: "fake",
  projectId: "chrono-craft-worktime-manager",
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

connectFirestoreEmulator(db, "127.0.0.1", 8001);
connectFunctionsEmulator(functions, "127.0.0.1", 4001);
