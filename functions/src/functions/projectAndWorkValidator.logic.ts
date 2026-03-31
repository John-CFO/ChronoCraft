/////////////////////// projectAndWorkValidator.logic.ts ////////////////////////////

// This file contains the logic handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

import { ProjectService } from "../services/projectService";
import { handleFunctionError } from "../errors/handleFunctionError";
import { ValidationError } from "../errors/domain.errors";

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
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError("payload must be an object");
      }

      if (
        typeof payload.projectId !== "string" ||
        payload.projectId.trim().length === 0
      ) {
        throw new ValidationError("projectId must be a non-empty string");
      }

      return await projectService.updateProject(
        payload.projectId,
        payload,
        uid,
      );
    }

    if (action === "setHourlyRate") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError("payload must be an object");
      }

      if (
        typeof payload.projectId !== "string" ||
        payload.projectId.trim().length === 0
      ) {
        throw new ValidationError("projectId must be a non-empty string");
      }

      if (typeof payload.rate !== "number") {
        throw new ValidationError("rate must be a number");
      }

      return await projectService.setHourlyRate(
        uid,
        payload.projectId,
        payload.rate,
      );
    }

    throw new HttpsError("invalid-argument", "Unknown action");
  } catch (error) {
    throw handleFunctionError(error, "projectsAndWorkValidator");
  }
}
