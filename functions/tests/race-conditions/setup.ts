////////////////////////////////// setup.ts ////////////////////////////////////

// This file contains the setup for the race conditions tests

///////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import dotenv from "dotenv";

///////////////////////////////////////////////////////////////////////////////

// use dotenv to load the .env file
dotenv.config({ path: ".env" });

beforeAll(async () => {
  const db = admin.firestore();

  const collections = [
    "Users",
    "Projects",
    "Earnings",
    "mfa_totp",
    "RateLimits",
  ];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();

    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  }
});
