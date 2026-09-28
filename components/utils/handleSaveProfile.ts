////////////////////// handleSaveProfile.ts ///////////////////////////

// This file contains the handleSaveProfile function,
// which is used to update the user's profile in Firestore.

///////////////////////////////////////////////////////////////////////

import { z } from "zod";
import { doc, updateDoc } from "firebase/firestore";

import { FIREBASE_FIRESTORE } from "../../firebaseConfig";
import { logError } from "../../lib/loggerClient";
import { uploadImageToProfile } from "./storage";

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
  imageMimeType: string | null;
  showAlert: (title: string, message: string) => void;
  onClose: () => void;
  setSaving: (state: boolean) => void;
}

export async function handleSaveProfile({
  userId,
  newName,
  newPersonalNumber,
  imageUri,
  imageMimeType,
  showAlert,
  onClose,
  setSaving,
}: HandleSaveProfileParams) {
  console.log("[handleSaveProfile] Start", {
    userId,
    newName,
    newPersonalNumber,
    imageUri,
    imageMimeType,
  });

  if (!userId) {
    console.error("[handleSaveProfile] missing userId");
    logError("handleSaveProfile/missingUserId", new Error("userId is missing"));
    return;
  }

  const trimmedName = newName.trim();
  const trimmedPID = newPersonalNumber.trim();

  const hasInput = trimmedName || trimmedPID || imageUri;

  console.log("[handleSaveProfile] trimmed", {
    trimmedName,
    trimmedPID,
    hasInput,
  });

  if (!hasInput) {
    console.log("[handleSaveProfile] No input, closing");
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

    console.log("[handleSaveProfile] normalizedData", normalizedData);
    ProfileSchema.parse(normalizedData);
    console.log("[handleSaveProfile] validation passed");
  } catch (err: any) {
    console.error("[handleSaveProfile] validation error", err);
    logError("handleSaveProfile/validation", err);
    showAlert(
      "Invalid input",
      err.errors?.[0]?.message || "Please enter valid data.",
    );
    return;
  }

  setSaving(true);
  console.log("[handleSaveProfile] setSaving(true)");

  try {
    const updatePayload: Record<string, any> = {};

    if (trimmedName) updatePayload.displayName = trimmedName;
    if (trimmedPID) updatePayload.personalNumber = trimmedPID;

    console.log(
      "[handleSaveProfile] updatePayload before image",
      updatePayload,
    );

    if (imageUri) {
      console.log("[handleSaveProfile] imageUri present");

      if (!imageMimeType) {
        console.error("[handleSaveProfile] imageMimeType missing");
        showAlert("Invalid image", "Could not determine the image type.");
        return;
      }

      const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
      console.log("[handleSaveProfile] allowedImageTypes", allowedImageTypes);

      if (!allowedImageTypes.includes(imageMimeType)) {
        console.error(
          "[handleSaveProfile] invalid imageMimeType",
          imageMimeType,
        );
        showAlert("Invalid image", "Please select a JPEG, PNG, or WebP image.");
        return;
      }

      console.log("[handleSaveProfile] calling uploadImageToProfile");
      await uploadImageToProfile(imageUri, imageMimeType);
      console.log("[handleSaveProfile] uploadImageToProfile completed");
    }

    console.log("[handleSaveProfile] updatePayload after image", updatePayload);

    if (Object.keys(updatePayload).length === 0) {
      console.log(
        "[handleSaveProfile] updatePayload empty, closing (image handled by cloud function)",
      );
      setSaving(false);
      onClose();
      return;
    }

    const userDocRef = doc(FIREBASE_FIRESTORE, "Users", userId);
    console.log("[handleSaveProfile] updating Firestore", {
      userId,
      updatePayload,
    });
    await updateDoc(userDocRef, updatePayload);
    console.log("[handleSaveProfile] Firestore update success");

    onClose();
  } catch (error: any) {
    console.error("[handleSaveProfile] error", error);
    logError("handleSaveProfile/updateProfile", error);
    showAlert("Error", error.message || "An unexpected error occurred.");
  } finally {
    console.log("[handleSaveProfile] finally setSaving(false)");
    setSaving(false);
  }
}
