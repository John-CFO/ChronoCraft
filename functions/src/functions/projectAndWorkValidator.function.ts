///////////////////// projectAndWorkValidator.function.ts ///////////////////////////

// This file contains the handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import {
  onCall,
  CallableRequest,
  HttpsError,
} from "firebase-functions/v2/https";

import { projectsAndWorkValidatorLogic } from "./projectAndWorkValidator.logic";
import { ValidationError } from "../errors/domain.errors";

/////////////////////////////////////////////////////////////////////////////////////

export const projectsAndWorkValidator = onCall(
  async (request: CallableRequest<any>) => {
    // Minimum Auth-Guard: if no user, immediately throw HttpsError unauthenticated
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Input-Validation
    if (!request.data) {
      throw new ValidationError("Missing request data.");
    }

    return await projectsAndWorkValidatorLogic(request);
  },
);
