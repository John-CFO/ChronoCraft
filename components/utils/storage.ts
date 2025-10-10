//////////////////////////////////////storage.ts/////////////////////////////////

// This file contains the uploadImageToProfile function, which is used to upload an image to Firebase Storage and return the URL to the image

////////////////////////////////////////////////////////////////////////////////

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function uploadImageToProfile(
  uri: string,
  userId: string
): Promise<string> {
  // basic input checks
  if (typeof uri !== "string" || !uri.trim()) {
    throw new Error("Invalid image URI");
  }
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("Invalid userId");
  }

  // allow safe userId characters only (adjust if UIDs contain other chars)
  const userIdPattern = /^[a-zA-Z0-9_\-]{1,256}$/;
  if (!userIdPattern.test(userId)) {
    throw new Error("Invalid userId format");
  }

  // fetch resource
  const res = await fetch(uri);
  if (!res.ok) throw new Error("Failed to fetch image resource");

  const blob = await res.blob();

  // validate mime type
  const mime = (blob as any).type || "";
  if (!mime.startsWith("image/")) {
    throw new Error("File is not an image");
  }

  // validate size (5MB max)
  const size = (blob as any).size;
  if (typeof size === "number" && size > MAX_BYTES) {
    throw new Error(`Image is too large (max ${MAX_BYTES} bytes)`);
  }

  // build safe filename
  const extCandidate = mime.split("/")[1] || "jpg";
  const safeExt =
    extCandidate.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const filename = `${userId}_${Date.now()}.${safeExt}`;

  // safe path (no raw user input injected)
  const path = `profilePictures/${encodeURIComponent(userId)}/${filename}`;

  // use default storage (no firebaseConfig import here)
  const storage = getStorage();
  const storageRef = ref(storage, path);
  const uploadResult = await uploadBytes(storageRef, blob);

  // get URL
  const downloadURL = await getDownloadURL(uploadResult.ref);
  return downloadURL;
}
