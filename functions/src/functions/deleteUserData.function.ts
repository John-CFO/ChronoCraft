/////////////////////// deleteUserData.function.ts //////////////////////

// This file contains the implementation of the deleteUserDataHandler function,
// which is used to delete user data from the application.

///////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

///////////////////////////////////////////////////////////////////////

type FirebaseConfig = {
  storageBucket?: string;
};

///////////////////////////////////////////////////////////////////////

function parseFirebaseConfig(): FirebaseConfig {
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}") as FirebaseConfig;
  } catch {
    return {};
  }
}

function getStorageBucketName(): string {
  const firebaseConfig = parseFirebaseConfig();

  const bucket =
    firebaseConfig.storageBucket ??
    process.env.FUNCTIONS_STORAGE_BUCKET ??
    process.env.STORAGE_BUCKET;

  if (!bucket) {
    throw new HttpsError("internal", "Missing storage bucket configuration");
  }

  return bucket;
}

function deleteStorageObjects(uid: string) {
  const bucket = admin.storage().bucket(getStorageBucketName());

  return Promise.all([
    bucket.deleteFiles({ prefix: `profilePictures/${uid}/` }).catch(() => {}),
    bucket.file(`profilePictures/${uid}`).delete({ ignoreNotFound: true }),
  ]);
}

export const deleteUserDataHandler = async (request: any) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  const db = admin.firestore();

  try {
    await admin.auth().getUser(uid);

    // ---------- storage cleanup ----------
    await deleteStorageObjects(uid);

    // ---------- mfa cleanup ----------
    try {
      const mfaRef = db.collection("mfa_totp").doc(uid);
      if ((await mfaRef.get()).exists) {
        await mfaRef.delete();
      }
    } catch {}

    // ---------- user data cleanup ----------
    const userRef = db.collection("Users").doc(uid);
    if ((await userRef.get()).exists) {
      await db.recursiveDelete(userRef);
    }

    // ---------- auth delete LAST ----------
    await admin.auth().deleteUser(uid);

    return { success: true };
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new HttpsError("internal", "User deletion failed");
  }
};
