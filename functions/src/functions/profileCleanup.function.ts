/////////////////////////////////// profileCleanup.function.ts //////////////////////////////////////

// This file contains the handler function for the profileCleanup function
// It deletes temporary profile picture files

/////////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { onCall, CallableRequest } from "firebase-functions/v2/https";

/////////////////////////////////////////////////////////////////////////////////////

const bucket = admin.storage().bucket();

export const profileCleanup = onCall(async (request: CallableRequest<any>) => {
  const uid = request.auth?.uid;
  if (!uid) return;

  const [files] = await bucket.getFiles({
    prefix: `profilePictures/${uid}/temp/`,
  });

  await Promise.all(files.map((f) => f.delete().catch(() => null)));

  return { success: true };
});
