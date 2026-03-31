////////////////// profileValidator.functions.ts ///////////////////////////////

// This file contains the handler function for the profileValidator function

////////////////////////////////////////////////////////////////////////////////

import {
  onCall,
  CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";

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

      // Auth-Check (EXPLICIT and HttpsError for unauthenticated)
      if (!uid) {
        throw new HttpsError(
          "unauthenticated",
          "Authentication required to perform this action.",
        );
      }

      // Input-Validation
      if (!data) {
        throw new ValidationError("Missing request data.");
      }

      if (typeof data === "object" && data !== null && "userId" in data) {
        throw new ValidationError("userId is not allowed.");
      }

      return await profileService.updateProfile(uid, data);
    } catch (error: unknown) {
      if (error instanceof HttpsError) throw error;
      throw handleFunctionError(error, "profileValidator");
    }
  },
);
