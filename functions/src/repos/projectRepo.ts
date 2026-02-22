/////////////////////// projectRepo.ts ///////////////////////////////

// This file contains the implementation of the ProjectRepo class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

//////////////////////////////////////////////////////////////////////

// Domain Types
export interface Project {
  id: string;
  userId: string;
  name: string;
  status: "active" | "archived";
  hourlyRate?: number;
  isTracking: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UpdateProjectInput {
  name?: string;
  status?: "active" | "archived";
  updatedAt: FirebaseFirestore.Timestamp;
  isTracking?: boolean;
}

export interface SetHourlyRateInput {
  hourlyRate: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

// Domain Errors
export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = "ProjectNotFoundError";
  }
}

// Repository
export class ProjectRepo {
  private readonly db = admin.firestore();
  private readonly projectsRef = this.db.collection("Projects");
  private readonly earningsRef = this.db.collection("Earnings");

  // Reads
  async getProjectById(projectId: string): Promise<Project> {
    const snap = await this.projectsRef.doc(projectId).get();

    if (!snap.exists) {
      throw new ProjectNotFoundError(projectId);
    }

    return this.mapProject(snap);
  }

  // Writes
  async updateProject(
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<void> {
    const ref = this.projectsRef.doc(projectId);

    // Explicit existing check (Domain logic)
    const snap = await ref.get();

    if (!snap.exists) {
      throw new ProjectNotFoundError(projectId);
    }

    // Pure update (Infrastructur)
    const updateData = this.mapUpdateInput(input);
    await ref.update(updateData);
  }

  // Hourly Rate
  async setProjectHourlyRate(
    projectId: string,
    input: SetHourlyRateInput,
  ): Promise<void> {
    await this.earningsRef.doc(projectId).set(input, { merge: true });
  }

  // Deletes
  async deleteProjectEarnings(projectId: string): Promise<void> {
    await this.earningsRef.doc(projectId).delete();
  }

  // Mapping (Firestore → Domain)
  private mapProject(snap: FirebaseFirestore.DocumentSnapshot): Project {
    const data = snap.data();

    if (!data) {
      throw new ProjectNotFoundError(snap.id);
    }

    return {
      id: snap.id,
      userId: data.userId,
      name: data.name,
      status: data.status,
      isTracking: data.isTracking,
      hourlyRate: data.hourlyRate,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapUpdateInput(
    input: UpdateProjectInput,
  ): FirebaseFirestore.UpdateData<Project> {
    const data: FirebaseFirestore.UpdateData<Project> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.status !== undefined) data.status = input.status;
    if (input.isTracking !== undefined) data.isTracking = input.isTracking;
    if (input.updatedAt !== undefined) data.updatedAt = input.updatedAt;

    return data;
  }

  // deleteSubcollections method
  async deleteSubcollections(path: string[], subcollectionIds: string[]) {
    let ref: FirebaseFirestore.DocumentReference | null = null;

    for (let i = 0; i < path.length; i += 2) {
      const collection = path[i];
      const docId = path[i + 1];
      ref = ref
        ? ref.collection(collection).doc(docId)
        : this.db.collection(collection).doc(docId);
    }

    if (!ref) throw new Error("Invalid path");

    for (const subId of subcollectionIds) {
      const subcollection = ref.collection(subId);
      const docs = await subcollection.listDocuments();
      await Promise.all(docs.map((d) => d.delete()));
    }
  }
}
