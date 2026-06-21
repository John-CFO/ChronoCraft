//////////////////////testEnv.ts////////////////////////////

// This file contains the test environment setup for the rules unit testing

////////////////////////////////////////////////////////////

import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import path from "path";
import fs from "node:fs";

////////////////////////////////////////////////////////////

// load the rules
const firestoreRules = fs.readFileSync(
  path.resolve(__dirname, "firestore.rules"),
  "utf8",
);

const storageRules = fs.readFileSync(
  path.resolve(__dirname, "storage.rules"),
  "utf8",
);

// setup the test environment
export const setupTestEnv = async () => {
  return initializeTestEnvironment({
    projectId: "demo-test",

    firestore: {
      host: "127.0.0.1",
      port: 8001,
      rules: firestoreRules,
    },

    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: storageRules,
    },
  });
};
