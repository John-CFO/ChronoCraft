////////////////////////////// profileService.ts ////////////////////////////////

// This file contains the implementation of the ProfileService class,
// which is used to interact with the Firestore database.
// It is used to update a user's profile.

/////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { logEvent } from "../utils/logger";

/////////////////////////////////////////////////////////////////////////////////

export class ProfileService {
  // use userRepo inside the class
  private userRepo = new UserRepo();

  // updateProfile method
  async updateProfile(uid: string, data: any) {
    // check if uid is valid
    if (!uid || typeof uid !== "string" || !uid.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error("Invalid UID");
    }

    // Update only allowed fields (displayName + personalNumber)
    const allowedFields = ["displayName", "personalNumber"];
    const sanitizedData: Record<string, any> = {};
    for (const key of allowedFields) {
      // check if key is in data
      if (key in data) {
        sanitizedData[key] = data[key];
      }
    }

    await this.userRepo.updateUser(uid, sanitizedData);

    logEvent("profile updated", "info", {
      uid,
      updatedFields: Object.keys(sanitizedData),
    });

    return { success: true };
  }
}
