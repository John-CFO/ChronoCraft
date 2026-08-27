//////////////////////////////// projectService.ts ////////////////////////////////

// This file contains the implementation of the ProjectService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

import { ProjectRepo } from "../repos/projectRepo";
import { ValidationError } from "../errors/domain.errors";
import { getTranslation } from "../services/localization/i18n";

////////////////////////////////////////////////////////////////////////////////////

export class ProjectService {
  private projectRepo = new ProjectRepo();

  // Queries
  async updateProject(
    userId: string,
    serviceId: string,
    projectId: string,
    data: any,
    request: any,
  ) {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    if (!userId || !serviceId || !projectId) {
      throw new ValidationError(t("validation.invalidInput"));
    }

    const { projectId: _, userId: __, serviceId: ___, ...updateData } = data;

    return this.projectRepo.updateProject(userId, serviceId, projectId, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });
  }

  async getProjects(userId: string, serviceId: string, request: any) {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    if (!userId || !serviceId) {
      throw new ValidationError(t("validation.invalidInput"));
    }

    const res = await this.projectRepo.getProjects(userId, serviceId);

    return {
      projects: res?.projects ?? [],
    };
  }

  async deleteProject(userId: string, serviceId: string, projectId: string) {
    return this.projectRepo.deleteProject(userId, serviceId, projectId);
  }

  async createProject(userId: string, name: string, serviceId: string) {
    return this.projectRepo.createProject(userId, name, serviceId);
  }

  async setHourlyRate(
    userId: string,
    serviceId: string,
    projectId: string,
    rate: number,
    request: any,
  ) {
    // use getTranslation to get the current language
    const t = await getTranslation(request.data?.language);

    if (
      !userId ||
      !serviceId ||
      !projectId ||
      typeof rate !== "number" ||
      Number.isNaN(rate)
    ) {
      throw new ValidationError(t("validation.invalidInput"));
    }

    const lockRef = admin
      .firestore()
      .collection("deletionLocks")
      .doc(projectId);
    const lockSnap = await lockRef.get();

    if (lockSnap.exists) {
      throw new ValidationError(t("validation.projectDeletionInProgress"));
    }

    return this.projectRepo.setProjectHourlyRate(userId, serviceId, projectId, {
      hourlyRate: rate,
      updatedAt: Timestamp.now(),
    });
  }
}
