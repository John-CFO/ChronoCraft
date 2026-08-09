////////////////////////////// beforeUserCreated.ts //////////////////////////

// This file contains the beforeUserCreated function, which is used to validate user registration
// It alows only whitelisted users to register

///////////////////////////////////////////////////////////////////////////////

import { beforeUserCreated } from "firebase-functions/v2/identity";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

/////////////////////////////////////////////////////////////////////////////

// function to validate user registration
export const validateReviewerEmail = async (email?: string) => {
  const db = getFirestore();

  const normalizedEmail = email?.trim().toLowerCase();

  // if no email is provided, throw an error
  if (!normalizedEmail) {
    console.log("BLOCK: missing email");
    throw new HttpsError("permission-denied", "Registration is not allowed");
  }

  const whitelistSnapshot = await db
    .collection("auth")
    .doc("reviewers")
    .collection("reviewers")
    .doc(normalizedEmail)
    .get();

  // if the user is not whitelisted, throw an error
  if (!whitelistSnapshot.exists) {
    console.log("BLOCK: whitelist missing", normalizedEmail);
    throw new HttpsError("permission-denied", "Registration is not allowed");
  }

  // set data from snapshot
  const data = whitelistSnapshot.data();

  // if the user is not active, throw an error
  if (data?.active !== true) {
    console.log("BLOCK: inactive reviewer", normalizedEmail, data);
    throw new HttpsError("permission-denied", "Registration is not allowed");
  }
};
export const validateReviewerRegistration = beforeUserCreated(async (event) => {
  await validateReviewerEmail(event.data?.email);
});
