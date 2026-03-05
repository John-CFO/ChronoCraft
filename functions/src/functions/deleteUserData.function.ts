/////////////////////// deleteUserData.function.ts //////////////////////

// This file contains the cloud function for deleting user data

///////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

///////////////////////////////////////////////////////////////////////

export const deleteUserDataHandler = async (request: any) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  const db = admin.firestore();
  const BUCKET_NAME = "chrono-craft-worktime-manager.appspot.com";
  const bucket = admin.storage().bucket(BUCKET_NAME);

  try {
    // Ensure user exists in Auth
    await admin.auth().getUser(uid);

    // Storage: delete folder + single file
    await bucket.deleteFiles({ prefix: `profilePictures/${uid}/` });
    await bucket
      .file(`profilePictures/${uid}`)
      .delete({ ignoreNotFound: true });

    // Root collections that contain per-user docs with id == uid
    // Delete simple root docs with id == uid
    try {
      const mfaRef = db.collection("mfa_totp").doc(uid);
      const mfaSnap = await mfaRef.get();
      if (mfaSnap.exists) {
        await mfaRef.delete();
        console.log(`Deleted mfa_totp/${uid}`);
      }
    } catch (err) {
      console.error("Failed deleting mfa_totp:", err);
    }

    // Delete RateLimits_v2 docs with prefix uid_<uid>_
    try {
      const scopes: ("uid" | "ip" | "device")[] = ["uid", "ip", "device"];
      for (const scope of scopes) {
        const userRateLimitsRef = db
          .collection("RateLimits_v2")
          .doc(scope)
          .collection("entries")
          .doc(uid); // safeId = uid

        await db.recursiveDelete(userRateLimitsRef);
      }
    } catch (err) {
      console.error("Failed deleting RateLimits_v2 docs for user:", err);
    }

    // Recursive delete of Users/{uid}
    const userDocRef = db.collection("Users").doc(uid);
    if ((await userDocRef.get()).exists) {
      await db.recursiveDelete(userDocRef);
    }

    // Delete Auth user last
    await admin.auth().deleteUser(uid);

    return { success: true };
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new HttpsError("internal", "User deletion failed");
  }
};
