////////////////////// handleSaveProfile.ts ///////////////////////////

// This file contains the handleSaveProfile function,
// which is used to update the user's profile in Firestore.

///////////////////////////////////////////////////////////////////////

import { z } from "zod";
import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../../firebaseConfig";
import { uploadImageToProfile, debugUpload } from "./storage";

///////////////////////////////////////////////////////////////////////

// simple schema validation
const ProfileSchema = z.object({
  displayName: z.string().min(1, "Name cannot be empty").optional(),
  personalNumber: z.string().min(1, "Personal ID cannot be empty").optional(),
});

interface HandleSaveProfileParams {
  userId: string;
  newName: string;
  newPersonalNumber: string;
  imageUri: string | null;
  showAlert: (title: string, message: string) => void;
  onClose: () => void;
  setSaving: (state: boolean) => void;
}

export async function handleSaveProfile({
  userId,
  newName,
  newPersonalNumber,
  imageUri,
  showAlert,
  onClose,
  setSaving,
}: HandleSaveProfileParams) {
  if (!userId) {
    console.warn("Missing user ID");
    return;
  }

  const trimmedName = newName.trim();
  const trimmedPID = newPersonalNumber.trim();

  const hasInput = trimmedName || trimmedPID || imageUri;

  if (!hasInput) {
    showAlert("Invalid input", "Please fill in at least one field.");
    setSaving(false);
    onClose();
    return;
  }

  try {
    const normalizedData = {
      displayName: trimmedName || undefined,
      personalNumber: trimmedPID || undefined,
    };

    ProfileSchema.parse(normalizedData);
  } catch (err: any) {
    showAlert(
      "Invalid input",
      err.errors?.[0]?.message || "Please enter valid data.",
    );
    return;
  }

  setSaving(true);

  try {
    const updatePayload: Record<string, any> = {};

    if (trimmedName) updatePayload.displayName = trimmedName;
    if (trimmedPID) updatePayload.personalNumber = trimmedPID;

    if (imageUri) {
      await debugUpload(imageUri);
      const uploadedImageUrl = await uploadImageToProfile(imageUri);

      if (uploadedImageUrl) {
        updatePayload.photoURL = uploadedImageUrl;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      setSaving(false);
      onClose();
      return;
    }

    const userDocRef = doc(FIREBASE_FIRESTORE, "Users", userId);
    await updateDoc(userDocRef, updatePayload);

    onClose();
  } catch (error: any) {
    showAlert("Error", error.message || "An unexpected error occurred.");
  } finally {
    setSaving(false);
  }
}
