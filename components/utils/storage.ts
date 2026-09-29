////////////////////////////////////// storage.ts //////////////////////////////////////

// This file contains the uploadImageToProfile function,
// which is used to upload an image to Firebase Storage and return the URL to the image.

//////////////////////////////////////////////////////////////////////////////////////////

import { ref } from "firebase/storage";
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";

import { FIREBASE_STORAGE, FIREBASE_AUTH } from "../../firebaseConfig";
import { logError } from "../../lib/loggerClient";
import { safeUploadString } from "./safeUpload";

//////////////////////////////////////////////////////////////////////////////////////////

export async function uploadImageToProfile(
  uri: string,
  mimeType: string,
): Promise<void> {
  const authUser = FIREBASE_AUTH.currentUser;
  if (!authUser?.uid) throw new Error("User not authenticated");

  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedImageTypes.includes(mimeType)) {
    throw new Error("Unsupported image type");
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const uploadId = Crypto.randomUUID();
  const storageRef = ref(
    FIREBASE_STORAGE,
    `profilePictures/quarantine/${authUser.uid}/${uploadId}`,
  );

  try {
    await safeUploadString(storageRef, base64, "base64", {
      contentType: mimeType,
    });
  } catch (error: any) {
    logError("storage/uploadImageToProfile", error);
    throw error;
  }
}
