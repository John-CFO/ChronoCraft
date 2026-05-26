///////////////////////////// profileUploadInit.function.ts //////////////////////////

// This file contains the handler function for the profileUploadInit function
// It is used to initialize the upload of a profile picture

/////////////////////////////////////////////////////////////////////////////////////

import {
  onCall,
  CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import crypto from "crypto";

/////////////////////////////////////////////////////////////////////////////////////

const BUCKET = admin.storage().bucket();

export const profileUploadInit = onCall(
  async (request: CallableRequest<any>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const fileId = crypto.randomUUID();
    const path = `profilePictures/${uid}/temp/${fileId}.jpg`;

    const file = BUCKET.file(path);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 5 * 60 * 1000,
      contentType: "image/jpeg",
    });

    return {
      uploadUrl: url,
      path,
      fileId,
    };
  },
);
