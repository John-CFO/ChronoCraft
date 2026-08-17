/////////////////////// projectAndWorkValidator.logic.ts ////////////////////////////

// This file contains the logic handler function for the projectAndWorkValidator function

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

import { ProjectService } from "../services/projectService";
import { handleFunctionError } from "../errors/handleFunctionError";
import { ValidationError } from "../errors/domain.errors";
import { getTranslation } from "../services/localization/i18n";

/////////////////////////////////////////////////////////////////////////////////////

export async function projectsAndWorkValidatorLogic(
  request: CallableRequest<any>,
) {
  // use getTranslation to get the current language
  const t = await getTranslation(request.data?.language);

  try {
    const uid = request.auth?.uid;
    const { action, payload } = request.data ?? {};

    const projectService = new ProjectService();

    // Auth-Check
    if (!uid) {
      throw new HttpsError("unauthenticated", t("errors.notLoggedIn"));
    }

    // Action required
    if (!action) {
      throw new HttpsError("invalid-argument", t("validation.missingAction"));
    }

    if (action === "getProjects") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError(t("validation.payloadMustBeObject"));
      }

      if (
        typeof payload.serviceId !== "string" ||
        payload.serviceId.trim().length === 0
      ) {
        throw new ValidationError(t("validation.serviceIdRequired"));
      }

      const result = await projectService.getProjects(
        uid,
        payload.serviceId,
        request,
      );

      return {
        projects: result?.projects ?? [],
      };
    }

    if (action === "deleteProject") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError(t("validation.payloadMustBeObject"));
      }

      if (
        typeof payload.projectId !== "string" ||
        payload.projectId.trim().length === 0
      ) {
        throw new ValidationError(t("validation.projectIdRequired"));
      }

      if (
        typeof payload.serviceId !== "string" ||
        payload.serviceId.trim().length === 0
      ) {
        throw new ValidationError(t("validation.serviceIdRequired"));
      }

      return await projectService.deleteProject(
        uid,
        payload.serviceId,
        payload.projectId,
      );
    }

    if (action === "createProject") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError(t("validation.payloadMustBeObject"));
      }

      if (
        typeof payload.serviceId !== "string" ||
        payload.serviceId.trim() === ""
      ) {
        throw new ValidationError(t("validation.serviceIdRequired"));
      }

      const result = await projectService.createProject(
        uid,
        payload.name,
        payload.serviceId,
      );

      return result;
    }

    if (action === "updateProject") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError(t("validation.payloadMustBeObject"));
      }

      if (
        typeof payload.serviceId !== "string" ||
        payload.serviceId.trim().length === 0
      ) {
        throw new ValidationError(t("validation.serviceIdRequired"));
      }

      try {
        return await projectService.updateProject(
          uid,
          payload.serviceId,
          payload.projectId,
          payload,
          request,
        );
      } catch (error) {
        throw handleFunctionError(error, "projectsAndWorkValidator");
      }
    }

    if (action === "setHourlyRate") {
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new ValidationError(t("validation.payloadMustBeObject"));
      }

      if (
        typeof payload.serviceId !== "string" ||
        payload.serviceId.trim().length === 0
      ) {
        throw new ValidationError(t("validation.serviceIdRequired"));
      }

      if (
        typeof payload.projectId !== "string" ||
        payload.projectId.trim().length === 0
      ) {
        throw new ValidationError(t("validation.projectIdRequired"));
      }

      if (typeof payload.rate !== "number" || Number.isNaN(payload.rate)) {
        throw new ValidationError(t("validation.rateMustBeNumber"));
      }

      return await projectService.setHourlyRate(
        uid,
        payload.serviceId,
        payload.projectId,
        payload.rate,
        request,
      );
    }

    throw new HttpsError("invalid-argument", t("errors.unknownAction"));
  } catch (error) {
    throw handleFunctionError(error, "projectsAndWorkValidator");
  }
}
