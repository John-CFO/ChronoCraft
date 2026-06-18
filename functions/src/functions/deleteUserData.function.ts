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
    return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}");
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

///////////////////////////////////////////////////////////////////////////

async function safe(op: Promise<unknown>) {
  try {
    await op;
  } catch {
    // idempotent delete
  }
}

async function deleteStorageObjects(uid: string) {
  const bucket = admin.storage().bucket(getStorageBucketName());

  await safe(
    bucket.deleteFiles({
      prefix: `profilePictures/${uid}/`,
      force: true,
    }),
  );

  await safe(
    bucket.file(`profilePictures/${uid}`).delete({
      ignoreNotFound: true,
    }),
  );
}

///////////////////////////////////////////////////////////////////////////

export const deleteUserDataHandler = async (request: any) => {
  const uid = request.auth?.uid;

  if (!uid || typeof uid !== "string") {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  const db = admin.firestore();
  const auth = admin.auth();

  const userRef = db.collection("Users").doc(uid);
  const mfaRef = db.collection("mfa_totp").doc(uid);

  let ownsDeletion = false;

  // atomarer ownership fence
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);

    // user already deleted
    if (!snap.exists) {
      return;
    }

    const data = snap.data() ?? {};

    // another request already owns deletion
    if (data.deletionState === "DELETING") {
      return;
    }

    tx.set(
      userRef,
      {
        deletionState: "DELETING",
        deletionStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    ownsDeletion = true;
  });

  // another concurrent request already performs deletion
  if (!ownsDeletion) {
    return { success: true };
  }

  await Promise.all([
    safe(deleteStorageObjects(uid)),
    safe(mfaRef.delete()),
    safe(db.recursiveDelete(userRef)),
    safe(auth.deleteUser(uid)),
  ]);

  return { success: true };
};
