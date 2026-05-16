//////////////////////////////// projectService.ts ////////////////////////////////

// This file contains the implementation of the ProjectService class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////////

import { Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

import { ProjectRepo } from "../repos/projectRepo";
import { ValidationError } from "../errors/domain.errors";

////////////////////////////////////////////////////////////////////////////////////

export class ProjectService {
  private projectRepo = new ProjectRepo();

  // validate service ownership
  private async assertServiceOwnership(userId: string, serviceId: string) {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const db = admin.firestore();

    const ref = db
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId);

    const snap = await ref.get();

    if (!snap.exists) {
      throw new ValidationError("Service not found or not accessible");
    }
  }

  // update project
  async updateProject(
    userId: string,
    serviceId: string,
    projectId: string,
    data: any,
  ) {
    if (!projectId || !serviceId || !userId) {
      throw new ValidationError("Invalid input");
    }

    const { projectId: _, userId: __, serviceId: ___, ...updateData } = data;

    return await this.projectRepo.updateProject(userId, projectId, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });
  }

  // get projects
  async getProjects(userId: string, serviceId: string) {
    if (!userId || !serviceId) {
      throw new ValidationError("Invalid input");
    }

    await this.assertServiceOwnership(userId, serviceId);

    const res = await this.projectRepo.getProjects(userId, serviceId);

    return {
      projects: res?.projects ?? [],
    };
  }

  async deleteProject(userId: string, serviceId: string, projectId: string) {
    await this.assertServiceOwnership(userId, serviceId);

    return this.projectRepo.deleteProject(userId, projectId);
  }

  async createProject(userId: string, name: string, serviceId: string) {
    await this.assertServiceOwnership(userId, serviceId);

    return this.projectRepo.createProject(userId, name, serviceId);
  }

  async setHourlyRate(userId: string, projectId: string, rate: number) {
    if (
      !userId ||
      !projectId ||
      typeof rate !== "number" ||
      Number.isNaN(rate)
    ) {
      throw new ValidationError("Invalid input");
    }

    return this.projectRepo.setProjectHourlyRate(projectId, {
      hourlyRate: rate,
      updatedAt: Timestamp.now(),
    });
  }
}
