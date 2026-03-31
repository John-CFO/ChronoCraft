//////////////////////////////// projectService.ts ////////////////////////////////

// This file contains the implementation of the ProjectService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import { ProjectRepo, SetHourlyRateInput } from "../repos/projectRepo";
import { logEvent } from "../utils/logger";
import { ValidationError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////////

export class ProjectService {
  // use projectRepo inside the service
  private projectRepo = new ProjectRepo();

  // updateProject method
  async updateProject(projectId: string, data: any, userId: string) {
    if (typeof projectId !== "string" || projectId.trim().length === 0) {
      throw new ValidationError("Invalid projectId");
    }

    const projectData = await this.projectRepo.getProjectById(projectId);
    const { projectId: _, ...updateData } = data;
    // check if userId is the same as projectData.userId
    if (projectData.userId !== userId) {
      throw new HttpsError("permission-denied", "Not your project");
    }
    // update project data
    await this.projectRepo.updateProject(projectId, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });

    logEvent("project updated", "info", { uid: userId, projectId });
    return { success: true };
  }

  // setHourlyRate method
  async setHourlyRate(userId: string, projectId: string, rate: number) {
    const input: SetHourlyRateInput = {
      hourlyRate: rate,
      updatedAt: Timestamp.now(),
    };

    // set hourly rate
    await this.projectRepo.setProjectHourlyRate(projectId, input);

    logEvent("hourly rate set", "info", { uid: userId, projectId, rate });
    return { success: true };
  }
}
