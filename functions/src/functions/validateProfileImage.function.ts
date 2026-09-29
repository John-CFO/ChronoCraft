///////////////////////////// validateProfileImage.function.ts //////////////////////////

// This file contains the implementation of the validateProfileImageHandler function,
// which is used to validate uploaded profile images.

///////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { StorageObjectData } from "firebase-functions/v2/storage";

//////////////////////////////////////////////////////////////////////////

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// function to detect image type
function detectImageType(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
    } as const;
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      mimeType: "image/png",
      extension: "png",
    } as const;
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return {
      mimeType: "image/webp",
      extension: "webp",
    } as const;
  }

  return null;
}

// function to validate and quarantine profile images
export async function validateProfileImageHandler(event: {
  data: StorageObjectData;
}): Promise<void> {
  const object = event.data;
  const objectName = object.name;
  const bucketName = object.bucket;

  if (!objectName.startsWith("profilePictures/quarantine/")) {
    return;
  }

  const pathParts = objectName.split("/");

  if (pathParts.length !== 4) {
    console.error("Invalid quarantine path:", objectName);
    return;
  }

  const uid = pathParts[2];

  const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
  if (!uid || !UID_PATTERN.test(uid)) {
    console.error("[validateProfileImage] Invalid UID:", uid);
    await admin
      .storage()
      .bucket(bucketName)
      .file(objectName)
      .delete()
      .catch(() => {
        /* ignore */
      });
    return;
  }

  const size = Number(object.size ?? 0);

  if (!Number.isFinite(size) || size <= 1024 || size >= MAX_IMAGE_SIZE) {
    console.error("Invalid image size:", { objectName, size });
    await admin.storage().bucket(bucketName).file(objectName).delete();
    return;
  }

  const bucket = admin.storage().bucket(bucketName);
  const file = bucket.file(objectName);

  const [buffer] = await file.download();

  const imageType = detectImageType(buffer);

  if (!imageType) {
    console.error("Invalid image format:", objectName);
    await file.delete();

    return;
  }

  const finalPath = `profilePictures/${uid}/current.${imageType.extension}`;

  const finalFile = bucket.file(finalPath);

  await finalFile.save(buffer, {
    metadata: {
      contentType: imageType.mimeType,
    },
  });

  // Retrieve generation -> unique version per upload
  const [metadata] = await finalFile.getMetadata();
  const version = metadata.generation;

  const downloadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/` +
    `${encodeURIComponent(finalPath)}?alt=media&v=${version}`;

  await admin.firestore().collection("Users").doc(uid).update({
    photoURL: downloadUrl,
  });

  await file.delete();
}
