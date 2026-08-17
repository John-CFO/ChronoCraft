///////////////////// secureDelete.functions.ts ///////////////////////////////

// This file contains the handler function for the secureDelete function

//////////////////////////////////////////////////////////////////////////////

import { onCall, HttpsError } from "firebase-functions/v2/https";

import { SecureDeleteService } from "../services/secureDeleteService";
import { handleFunctionError } from "../errors/handleFunctionError";
import { PermissionError, ValidationError } from "../errors/domain.errors";
import { getTranslation } from "../services/localization/i18n";

//////////////////////////////////////////////////////////////////////////////

export const secureDelete = onCall(async (request) => {
  // use getTranslation to get the current language
  const t = await getTranslation(request.data?.language);

  try {
    const uid = request.auth?.uid;
    const data = request.data;
    const deleteService = new SecureDeleteService();

    // Auth-Check
    if (!uid) {
      throw new HttpsError("unauthenticated", t("errors.notLoggedIn"));
    }

    // Data-Validation
    if (!data) {
      throw new ValidationError(t("validation.missingData"));
    }
    if (!data.userId) {
      throw new ValidationError(t("validation.missingUserId"));
    }
    if (!data.serviceId) {
      throw new ValidationError(t("validation.missingServiceId"));
    }

    if (uid !== data.userId) {
      throw new PermissionError(t("permission.cannotDeleteOthersData"));
    }

    return await deleteService.deleteUserService(
      data.userId,
      data.serviceId,
      data.subs,
    );
  } catch (error) {
    throw handleFunctionError(error, "secureDelete");
  }
});
