////////////////// profileValidator.functions.ts ///////////////////////////////

// This file contains the handler function for the profileValidator function

////////////////////////////////////////////////////////////////////////////////

import { onCall, CallableRequest } from "firebase-functions/v2/https";

import { ProfileService } from "../services/profileService";
import { handleFunctionError } from "../errors/handleFunctionError";
import { ValidationError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////

export const profileValidator = onCall(
  async (request: CallableRequest<any>) => {
    try {
      const uid = request.auth?.uid;
      const data = request.data;
      const profileService = new ProfileService();

      // Auth-Check
      if (!uid) {
        throw new ValidationError("Not logged in", {
          userMessage: "Authentication required to perform this action.",
        });
      }

      return await profileService.updateProfile(uid, data);
    } catch (error: unknown) {
      throw handleFunctionError(error, "profileValidator");
    }
  },
);
