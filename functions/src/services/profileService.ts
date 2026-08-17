////////////////////////////// profileService.ts ////////////////////////////////

// This file contains the implementation of the ProfileService class,
// which is used to interact with the Firestore database.
// It is used to update a user's profile.

/////////////////////////////////////////////////////////////////////////////////

import { UserRepo } from "../repos/userRepo";
import { logEvent } from "../utils/logger";
import { ValidationError } from "../errors/domain.errors";
import { getTranslation } from "../services/localization/i18n";

// /////////////////////////////////////////////////////////////////////////////////

type ProfileUpdateInput = {
  displayName?: string | null;
  personalNumber?: string | null;
};

// /////////////////////////////////////////////////////////////////////////////////

export class ProfileService {
  private userRepo = new UserRepo();

  async updateProfile(request: any, uid: string, data: ProfileUpdateInput) {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    // UID validation
    if (!uid || typeof uid !== "string" || !/^[a-zA-Z0-9_-]+$/.test(uid)) {
      throw new ValidationError(t("validation.invalidUid"));
    }

    // payload validation
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new ValidationError(t("validation.invalidPayload"));
    }

    const allowedFields = ["displayName", "personalNumber"];
    const sanitizedData: Record<string, unknown> = {};

    // reject unknown fields (security boundary)
    for (const key of Object.keys(data)) {
      if (!allowedFields.includes(key)) {
        throw new ValidationError(t("validation.unknownField", { field: key }));
      }
    }

    // displayName
    if (data.displayName != null) {
      if (typeof data.displayName !== "string") {
        throw new ValidationError(t("validation.displayNameMustBeString"));
      }

      const value = data.displayName.trim();

      if (value.length === 0) {
        throw new ValidationError(t("validation.displayNameCannotBeEmpty"));
      }

      if (value.length > 80) {
        throw new ValidationError(t("validation.displayNameTooLong"));
      }

      sanitizedData.displayName = value;
    }

    // personalNumber
    if (data.personalNumber != null) {
      if (typeof data.personalNumber !== "string") {
        throw new ValidationError(t("validation.personalNumberMustBeString"));
      }

      const value = data.personalNumber.trim();

      if (value.length === 0) {
        throw new ValidationError(t("validation.personalNumberCannotBeEmpty"));
      }

      if (value.length > 64) {
        throw new ValidationError(t("validation.personalNumberTooLong"));
      }

      sanitizedData.personalNumber = value;
    }

    if (Object.keys(sanitizedData).length === 0) {
      throw new ValidationError(t("validation.nothingToUpdate"));
    }

    await this.userRepo.updateUser(uid, sanitizedData);

    logEvent("profile updated", "info", {
      updatedFields: Object.keys(sanitizedData),
    });

    return { success: true };
  }
}
