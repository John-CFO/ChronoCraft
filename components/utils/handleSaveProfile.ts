//////////////////////handleSaveProfile.ts///////////////////////////

// This file contains the handleSaveProfile function, which is used to update the user's profile in Firestore.

/////////////////////////////////////////////////////////////////////

import { z } from "zod";
import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../../firebaseConfig";
import { uploadImageToProfile } from "./storage";

//////////////////////////////////////////////////////////////////////

// simple schema validation
const ProfileSchema = z.object({
  displayName: z.string().min(1, "Name cannot be empty"),
  personalID: z.string().min(1, "Personal ID cannot be empty"),
});

interface HandleSaveProfileParams {
  userId: string;
  newName: string;
  newPersonalID: string;
  imageUri: string | null;
  showAlert: (title: string, message: string) => void;
  onClose: () => void;
  setSaving: (state: boolean) => void;
}

export async function handleSaveProfile({
  userId,
  newName,
  newPersonalID,
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
  const trimmedPID = newPersonalID.trim();

  // check if at least one field is filled or image selected
  const hasInput = trimmedName || trimmedPID || imageUri;
  if (!hasInput) {
    showAlert("Invalid input", "Please fill in at least one field.");
    setSaving(false);
    onClose();
    return;
  }

  // validate input if any text field changed
  try {
    ProfileSchema.parse({
      displayName: trimmedName,
      personalID: trimmedPID,
    });
  } catch (err: any) {
    showAlert(
      "Invalid input",
      err.errors?.[0]?.message || "Please enter valid data."
    );
    return;
  }

  setSaving(true);

  try {
    const updatePayload: Record<string, any> = {};
    if (trimmedName) updatePayload.displayName = trimmedName;
    if (trimmedPID) updatePayload.personalID = trimmedPID;

    if (imageUri) {
      const uploadedImageUrl = await uploadImageToProfile(imageUri, userId);
      if (uploadedImageUrl) updatePayload.photoURL = uploadedImageUrl;
    }

    if (Object.keys(updatePayload).length === 0) {
      setSaving(false);
      onClose();
      return;
    }

    const userDocRef = doc(FIREBASE_FIRESTORE, "users", userId);
    await updateDoc(userDocRef, updatePayload);

    onClose();
  } catch (error: any) {
    showAlert("Error", error.message || "An unexpected error occurred.");
  } finally {
    setSaving(false);
  }
}
