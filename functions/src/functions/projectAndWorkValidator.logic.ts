/////////////////////// projectAndWorkValidator.logic.ts ////////////////////////////

// This file contains the logic handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import { https } from "firebase-functions/v2";

import { ProjectService } from "../services/projectService";
import { handleFunctionError } from "../errors/handleFunctionError";

/////////////////////////////////////////////////////////////////////////////////////

export async function projectsAndWorkValidatorLogic(request: {
  data?: any;
  auth?: { uid: string } | null;
}) {
  try {
    const uid = request.auth?.uid;
    const { action, payload } = request.data ?? {};
    const projectService = new ProjectService();

    // Auth-Check
    if (!uid) {
      throw new https.HttpsError("unauthenticated", "Not logged in");
    }

    // Check if Action existiert
    if (!action) {
      throw new https.HttpsError("invalid-argument", "Missing action");
    }

    // Case distinction for different actions
    if (action === "updateProject") {
      return await projectService.updateProject(payload.id, payload, uid);
    }

    if (action === "setHourlyRate") {
      return await projectService.setHourlyRate(
        uid,
        payload.projectId,
        payload
      );
    }

    // If a unknown action is called
    throw new https.HttpsError("invalid-argument", "Unknown action");
  } catch (error: any) {
    // Errorhandling
    throw handleFunctionError(error, "projectsAndWorkValidator");
  }
}
