/////////////////////// projectAndWorkValidator.logic.ts ////////////////////////////

// This file contains the logic handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

import { ProjectService } from "../services/projectService";
import { handleFunctionError } from "../errors/handleFunctionError";

/////////////////////////////////////////////////////////////////////////////////////

export async function projectsAndWorkValidatorLogic(
  request: CallableRequest<any>,
) {
  try {
    const uid = request.auth?.uid;
    const { action, payload } = request.data ?? {};
    const projectService = new ProjectService();

    // Auth-Check
    if (!uid) {
      throw new HttpsError("unauthenticated", "Not logged in");
    }

    // Action required
    if (!action) {
      throw new HttpsError("invalid-argument", "Missing action");
    }

    if (action === "updateProject") {
      return await projectService.updateProject(payload.id, payload, uid);
    }

    if (action === "setHourlyRate") {
      return await projectService.setHourlyRate(
        uid,
        payload.projectId,
        payload,
      );
    }

    throw new HttpsError("invalid-argument", "Unknown action");
  } catch (error) {
    throw handleFunctionError(error, "projectsAndWorkValidator");
  }
}
