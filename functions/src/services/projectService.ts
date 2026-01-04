//////////////////////////////// projectService.ts ////////////////////////////////

// This file contains the implementation of the ProjectService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";

import { ProjectRepo, SetHourlyRateInput } from "../repos/projectRepo";
import { logEvent } from "../utils/logger";

////////////////////////////////////////////////////////////////////////////////////

export class ProjectService {
  // use projectRepo inside the service
  private projectRepo = new ProjectRepo();

  // updateProject method
  async updateProject(projectId: string, data: any, userId: string) {
    const projectData = await this.projectRepo.getProjectById(projectId);
    // check if projectData is null
    if (!projectData) {
      throw new Error("Project not found");
    }
    // check if userId is the same as projectData.userId
    if (projectData.userId !== userId) {
      throw new Error("Not your project");
    }
    // update project data
    await this.projectRepo.updateProject(projectId, {
      ...data,
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
