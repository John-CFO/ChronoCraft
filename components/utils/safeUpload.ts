//////////////////////////// safeUploadString.ts //////////////////////////////

// This file contains the safeUploadString function,
// which is used to upload a string to Firebase Storage.

///////////////////////////////////////////////////////////////////////////////

import {
  uploadString,
  UploadResult,
  UploadMetadata,
  StorageReference,
} from "firebase/storage";

///////////////////////////////////////////////////////////////////

export async function safeUploadString(
  storageRef: StorageReference,
  data: string,
  format: "raw" | "base64" | "base64url" | "data_url",
  metadata?: UploadMetadata,
): Promise<UploadResult> {
  const g = global as any;
  const originalBlob = g.Blob;

  try {
    // Temporarily remove Blob in Hermes environment
    // so that the SDK uses the native ArrayBuffer path
    if (g.HermesInternal && typeof g.Blob !== "undefined") {
      delete g.Blob;
    }
    return await uploadString(storageRef, data, format, metadata);
  } finally {
    // Restore the blob so as not to affect other modules
    if (originalBlob !== undefined) {
      g.Blob = originalBlob;
    }
  }
}
