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
import { getTranslation } from "../services/localization/i18n";

/////////////////////////////////////////////////////////////////////////////////////

export const projectsAndWorkValidator = onCall(
  async (request: CallableRequest<any>) => {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    // Minimum Auth-Guard: if no user, immediately throw HttpsError unauthenticated
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        t("errors.authenticationRequired"),
      );
    }

    // Input-Validation
    if (!request.data) {
      throw new ValidationError(t("validation.missingRequestData"));
    }

    return await projectsAndWorkValidatorLogic(request);
  },
);
