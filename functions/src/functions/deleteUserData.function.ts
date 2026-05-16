//////////////////////// deleteUserData.function.ts ////////////////////////

// This file contains the implementation of the deleteUserDataHandler function,
// which is used to delete user data from the application.

/////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

///////////////////////////////////////////////////////////////////////////

type FirebaseConfig = {
  storageBucket?: string;
};

///////////////////////////////////////////////////////////////////////////

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

async function deleteStorageObjects(uid: string) {
  const bucket = admin.storage().bucket(getStorageBucketName());

  await Promise.all([
    bucket.deleteFiles({
      prefix: `profilePictures/${uid}/`,
      force: true,
    }),
    bucket.file(`profilePictures/${uid}`).delete({
      ignoreNotFound: true,
    }),
  ]);
}

///////////////////////////////////////////////////////////////////////////

export const deleteUserDataHandler = async (request: any) => {
  const uid = request.auth?.uid;

  if (!uid || typeof uid !== "string") {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  const db = admin.firestore();

  const userRef = db.collection("Users").doc(uid);
  const mfaRef = db.collection("mfa_totp").doc(uid);
  const deletionLockRef = db.collection("deletionLocks").doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const lockSnap = await tx.get(deletionLockRef);

      if (!lockSnap.exists) {
        tx.set(deletionLockRef, {
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
          uid,
        });
      }
    });

    await deleteStorageObjects(uid).catch(() => {});

    await mfaRef.delete().catch(() => {});

    await db.recursiveDelete(userRef).catch(() => {});

    try {
      await admin.auth().deleteUser(uid);
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        throw error;
      }
    }

    await deletionLockRef.delete().catch(() => {});

    return { success: true };
  } catch (error) {
    console.error("Error deleting user data:", error);

    throw new HttpsError("internal", "User deletion failed");
  }
};
