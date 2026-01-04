///////////////////// secureDelete.functions.ts ///////////////////////////////

// This file contains the handler function for the secureDelete function

//////////////////////////////////////////////////////////////////////////////

import { https } from "firebase-functions/v2";

import { SecureDeleteService } from "../services/secureDeleteService";
import { handleFunctionError } from "../errors/handleFunctionError";
import { PermissionError, ValidationError } from "../errors/domain.errors";

//////////////////////////////////////////////////////////////////////////////

export const secureDelete = https.onCall(async (request) => {
  try {
    const uid = request.auth?.uid;
    const data = request.data;
    const deleteService = new SecureDeleteService();

    // Auth-Check
    if (!uid) {
      throw new https.HttpsError("unauthenticated", "Not logged in");
    }

    // Data validation
    if (!data) {
      throw new ValidationError("Missing data");
    }

    if (uid !== data.userId) {
      throw new PermissionError("Cannot delete others' data");
    }

    return await deleteService.deleteUserService(
      data.userId,
      data.serviceId,
      data.subs
    );
  } catch (error: any) {
    // Error handling
    throw handleFunctionError(error, "secureDelete");
  }
});
