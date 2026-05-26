////////////////////////////////////// profileFinalize.function.ts //////////////////////////////////////

// This file contains the handler function for the profileFinalize function
// It finalizes profile updates and securely promotes uploaded profile images.

////////////////////////////////////////////////////////////////////////////////////////////////////////

// initialize Firebase Admin SDK to start storage emulator
// (This is important to get storage emulator to work on localhost before running functions locally in e2e tests)

process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
////////////////////////////////////////////////////////////////////////////////////////////////////////

import {
  onCall,
  CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";

import * as admin from "firebase-admin";
import { ProfileService } from "../services/profileService";

////////////////////////////////////////////////////////////////////////////////////////////////////////

// Admin-Init
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: "chrono-craft-worktime-manager.appspot.com",
  });
}

const bucket = admin.storage().bucket();
console.log("BUCKET NAME:", bucket.name);

////////////////////////////////////////////////////////////////////////////////////////////////////////

export const profileFinalize = onCall(
  async (request: CallableRequest<unknown>) => {
    console.log("REQUEST DATA", request.data);

    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const data = request.data as any;

    const { path, displayName, personalNumber } = data || {};

    const hasImage = typeof path === "string" && path.length > 0;

    let photoURL: string | null = null;

    // -------------------------------- IMAGE FLOW --------------------------------

    if (hasImage) {
      const expectedPrefix = `profilePictures/${uid}/temp/`;

      if (!path.startsWith(expectedPrefix)) {
        throw new HttpsError("permission-denied", "Invalid storage path");
      }

      const file = bucket.file(path);

      console.log("LOOKING FOR PATH:", path);
      console.log("FULL FILE PATH:", file.name);

      const [exists] = await file.exists();

      if (!exists) {
        throw new HttpsError("not-found", "Temporary upload not found");
      }

      const [metadata] = await file.getMetadata();

      const contentType = metadata.contentType ?? "image/jpeg";

      const destinationPath = `profilePictures/${uid}/current.jpg`;

      const destinationFile = bucket.file(destinationPath);

      const [buffer] = await file.download();

      if (!buffer || buffer.length === 0) {
        throw new HttpsError("internal", "Upload corrupted or not ready");
      }

      await destinationFile.save(buffer, {
        metadata: {
          contentType,
        },
      });

      await file.delete().catch(() => null);

      await destinationFile.setMetadata({
        metadata: {
          finalized: "true",
          finalizedAt: new Date().toISOString(),
          owner: uid,
        },
      });

      photoURL = destinationPath;
    }

    // -------------------------------- SERVICE LAYER --------------------------------

    const profileService = new ProfileService();

    const updatePayload: Record<string, unknown> = {};

    if (photoURL) {
      updatePayload.photoURL = photoURL;
    }

    if (typeof displayName === "string" && displayName.trim()) {
      updatePayload.displayName = displayName.trim();
    }

    if (typeof personalNumber === "string" && personalNumber.trim()) {
      updatePayload.personalNumber = personalNumber.trim();
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new HttpsError("invalid-argument", "Nothing to update");
    }

    await profileService.updateProfile(uid, updatePayload);

    // -------------------------------- RESPONSE --------------------------------

    return {
      success: true,
      photoURL,
    };
  },
);
