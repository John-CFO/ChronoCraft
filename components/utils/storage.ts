////////////////////////////////////// storage.ts //////////////////////////////////////

// This file contains the uploadImageToProfile function,
// which is used to upload an image to Firebase Storage and return the URL to the image.

//////////////////////////////////////////////////////////////////////////////////////////

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { FIREBASE_STORAGE, FIREBASE_AUTH } from "../../firebaseConfig";

//////////////////////////////////////////////////////////////////////////////////////////

export async function uploadImageToProfile(uri: string): Promise<string> {
  // check if user is authenticated
  const authUser = FIREBASE_AUTH.currentUser;

  if (!authUser?.uid) {
    throw new Error("User not authenticated");
  }

  // get user id
  const uid = authUser.uid;

  // upload image
  const res = await fetch(uri);

  // convert image to blob
  const blob = await res.blob();

  // get storage reference
  const storageRef = ref(
    FIREBASE_STORAGE,
    `profilePictures/${uid}/current.jpg`,
  );

  try {
    const result = await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(result.ref);
    return url;
  } catch (error: any) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

export async function debugUpload(uri: string) {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const blob = new Blob([arrayBuffer], {
    type: "image/jpeg",
  });

  return blob;
}
