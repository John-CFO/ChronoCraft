////////////////////// handleSaveProfile.ts ////////////////////////

// This file is used to validate user inputs for login and registration

//////////////////////////////////////////////////////////////////////

import { httpsCallable } from "firebase/functions";
import { ref, uploadBytesResumable } from "firebase/storage";
import { FIREBASE_FUNCTIONS, FIREBASE_STORAGE } from "../../firebaseConfig";

///////////////////////////////////////////////////////////////////////

export async function handleSaveProfile({
  userId,
  newName,
  newPersonalNumber,
  imageUri,
  showAlert,
  onClose,
  setSaving,
}: any) {
  if (!userId) return;

  const trimmedName = newName?.trim() ?? "";
  const trimmedPID = newPersonalNumber?.trim() ?? "";

  const hasInput = !!(trimmedName || trimmedPID || imageUri);

  if (!hasInput) {
    showAlert("Invalid input", "Please fill in at least one field.");
    return;
  }

  setSaving(true);

  try {
    const finalize = httpsCallable(
      FIREBASE_FUNCTIONS,
      "profileFinalizeFunction",
    );

    let storagePath: string | null = null;

    if (imageUri) {
      const path = `profilePictures/${userId}/temp/${Date.now()}.jpg`;

      const fileRef = ref(FIREBASE_STORAGE, path);

      const response = await fetch(imageUri);

      const blob = await response.blob();

      const uploadTask = uploadBytesResumable(fileRef, blob, {
        contentType: blob.type || "image/jpeg",
      });

      await uploadTask;

      storagePath = path;
    }

    await finalize({
      displayName: trimmedName || null,
      personalNumber: trimmedPID || null,
      path: storagePath,
    });

    onClose();
  } catch (error: any) {
    showAlert(
      "Storage Error",
      error?.message || error?.code || "Upload failed",
    );
  } finally {
    setSaving(false);
  }
}
