////////////////////////////// profileService.ts ////////////////////////////////

// This file contains the implementation of the ProfileService class,
// which is used to interact with the Firestore database.
// It is used to update a user's profile.

/////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { logEvent } from "../utils/logger";
import { ValidationError } from "../errors/domain.errors";

/////////////////////////////////////////////////////////////////////////////////

export class ProfileService {
  // use userRepo inside the class
  private userRepo = new UserRepo();

  // updateProfile method
  async updateProfile(uid: string, data: any) {
    // UID-Validation
    if (!uid || typeof uid !== "string" || !/^[a-zA-Z0-9_-]+$/.test(uid)) {
      throw new ValidationError("Invalid UID");
    }

    // Payload-Validation
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new ValidationError("Invalid payload.");
    }

    const allowedFields = ["displayName", "personalNumber"];
    const sanitizedData: Record<string, any> = {};

    // optional: reject unknown fields (stricter, but safer)
    for (const key of Object.keys(data)) {
      if (!allowedFields.includes(key)) {
        throw new ValidationError(`Unknown field: ${key}`);
      }
    }

    // Field-Validation + sanitization
    if ("displayName" in data) {
      if (typeof data.displayName !== "string") {
        throw new ValidationError("displayName must be a string");
      }

      const value = data.displayName.trim();

      if (value.length === 0) {
        throw new ValidationError("displayName cannot be empty");
      }

      const MAX_DISPLAY_NAME = 100;

      if (value.length > MAX_DISPLAY_NAME) {
        throw new ValidationError("displayName too long");
      }

      sanitizedData.displayName = value;
    }

    if ("personalNumber" in data) {
      if (typeof data.personalNumber !== "string") {
        throw new ValidationError("personalNumber must be a string");
      }

      const value = data.personalNumber.trim();
      if (value.length === 0) {
        throw new ValidationError("personalNumber cannot be empty");
      }

      sanitizedData.personalNumber = value;
    }

    // ensure at least one valid field
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
