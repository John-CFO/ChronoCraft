////////////////////////////////// setup.ts ////////////////////////////////////

// This file contains the setup for the race conditions tests

///////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

///////////////////////////////////////////////////////////////////////////////

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
