////////////////////////////// profileService.ts ////////////////////////////////

// This file contains the implementation of the ProfileService class,
// which is used to interact with the Firestore database.
// It is used to update a user's profile.

/////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { logEvent } from "../utils/logger";
import { ValidationError } from "../errors/domain.errors";

// /////////////////////////////////////////////////////////////////////////////////

type ProfileUpdateInput = {
  displayName?: string | null;
  personalNumber?: string | null;
  photoURL?: string | null;
};

// /////////////////////////////////////////////////////////////////////////////////

export class ProfileService {
  private userRepo = new UserRepo();

  async updateProfile(uid: string, data: ProfileUpdateInput) {
    // UID validation
    if (!uid || typeof uid !== "string" || !/^[a-zA-Z0-9_-]+$/.test(uid)) {
      throw new ValidationError("Invalid UID");
    }

    // payload validation
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new ValidationError("Invalid payload.");
    }

    const allowedFields = ["displayName", "personalNumber", "photoURL"];
    const sanitizedData: Record<string, unknown> = {};

    // reject unknown fields (security boundary)
    for (const key of Object.keys(data)) {
      if (!allowedFields.includes(key)) {
        throw new ValidationError(`Unknown field: ${key}`);
      }
    }

    // displayName
    if (data.displayName != null) {
      if (typeof data.displayName !== "string") {
        throw new ValidationError("displayName must be a string");
      }

      const value = data.displayName.trim();

      if (value.length === 0) {
        throw new ValidationError("displayName cannot be empty");
      }

      if (value.length > 80) {
        throw new ValidationError("displayName too long");
      }

      sanitizedData.displayName = value;
    }

    // personalNumber
    if (data.personalNumber != null) {
      if (typeof data.personalNumber !== "string") {
        throw new ValidationError("personalNumber must be a string");
      }

      const value = data.personalNumber.trim();

      if (value.length === 0) {
        throw new ValidationError("personalNumber cannot be empty");
      }

      if (value.length > 64) {
        throw new ValidationError("personalNumber too long");
      }

      sanitizedData.personalNumber = value;
    }

    // photoURL passthrough (already validated in storage layer)
    if (data.photoURL != null) {
      if (typeof data.photoURL !== "string") {
        throw new ValidationError("photoURL must be a string");
      }

      sanitizedData.photoURL = data.photoURL;
    }

    if (Object.keys(sanitizedData).length === 0) {
      throw new ValidationError("Nothing to update.");
    }

    await this.userRepo.updateUser(uid, sanitizedData);

    logEvent("profile updated", "info", {
      uid,
      updatedFields: Object.keys(sanitizedData),
    });

    return { success: true };
  }
}
