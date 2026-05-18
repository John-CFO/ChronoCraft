/////////////////////// projectRepo.ts ///////////////////////////////

// This file contains the implementation of the ProjectRepo class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";

import { DomainError, AuthorizationError } from "../errors/domain.errors";

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

export class ProjectNotFoundError extends DomainError {
  constructor(projectId: string) {
    super("not-found", `Project not found: ${projectId}`, "Project not found");

    this.name = "ProjectNotFoundError";
  }
}

// Repository
export class ProjectRepo {
  private readonly db = admin.firestore();
  private readonly projectsRef = this.db.collection("Projects");
  private readonly earningsRef = this.db.collection("Earnings");

  // Reads
  async getProject(projectId: string): Promise<Project> {
    const ref = this.db.collection("Projects").doc(projectId);

    const snap = await ref.get();

    if (!snap.exists) {
      throw new ProjectNotFoundError(projectId);
    }

    return this.mapProject(snap);
  }

  async getProjects(userId: string, serviceId: string) {
    const snapshot = await this.db
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId)
      .collection("Projects")
      .get();

    return {
      projects: snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    };
  }

  // Deletes
  async deleteProject(ownerId: string, projectId: string): Promise<void> {
    const projectRef = this.projectsRef.doc(projectId);
    const earningsRef = this.earningsRef.doc(projectId);
    const deletionLockRef = this.db.collection("deletionLocks").doc(projectId);

    await this.db.runTransaction(async (tx) => {
      const projectSnap = await tx.get(projectRef);
      const lockSnap = await tx.get(deletionLockRef);

      if (!projectSnap.exists) {
        throw new ProjectNotFoundError(projectId);
      }

      if (projectSnap.data()?.userId !== ownerId) {
        throw new AuthorizationError("Not your project");
      }

      if (lockSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "Deletion already in progress",
        );
      }

      tx.set(deletionLockRef, {
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        uid: ownerId,
      });

      tx.delete(projectRef);
      tx.delete(earningsRef);
    });

    await this.db
      .collection("deletionLocks")
      .doc(projectId)
      .delete()
      .catch(() => {});
  }

  // Writes
  async createProject(userId: string, name: string, serviceId: string) {
    const ref = this.db.collection("Projects").doc();

    const data = {
      id: ref.id,
      userId,
      name,
      serviceId,
      status: "active",
      isTracking: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await ref.set(data);

    return {
      projectId: ref.id,
      serviceId,
      userId,
    };
  }

  async updateProject(
    ownerId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<void> {
    const ref = this.db.collection("Projects").doc(projectId);

    await this.db.runTransaction(async (tx) => {
      await this.ensureProjectOwnership(tx, ownerId, ref, projectId);

      tx.update(ref, {
        ...this.mapUpdateInput(input),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });
  }

  // Hourly Rate
  async setProjectHourlyRate(
    ownerId: string,
    projectId: string,
    input: SetHourlyRateInput,
  ): Promise<void> {
    const projectRef = this.projectsRef.doc(projectId);
    const earningsRef = this.earningsRef.doc(projectId);
    const deletionLockRef = this.db.collection("deletionLocks").doc(projectId);

    await this.db.runTransaction(async (tx) => {
      const [projectSnap, lockSnap] = await Promise.all([
        tx.get(projectRef),
        tx.get(deletionLockRef),
      ]);

      if (!projectSnap.exists) {
        throw new ProjectNotFoundError(projectId);
      }

      const data = projectSnap.data();

      if (!data || data.userId !== ownerId) {
        throw new AuthorizationError("Not your project");
      }

      if (lockSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "Project deletion in progress",
        );
      }

      tx.set(earningsRef, input, { merge: true });
    });
  }

  // Deletes
  async deleteProjectEarnings(
    ownerId: string,
    projectId: string,
  ): Promise<void> {
    const projectRef = this.projectsRef.doc(projectId);
    const earningsRef = this.earningsRef.doc(projectId);

    await this.db.runTransaction(async (tx) => {
      await this.ensureProjectOwnership(tx, ownerId, projectRef, projectId);

      tx.delete(earningsRef);
    });
  }

  // Ownership
  private async ensureProjectOwnership(
    tx: FirebaseFirestore.Transaction,
    ownerId: string,
    projectRef: FirebaseFirestore.DocumentReference,
    projectId: string,
  ): Promise<void> {
    const snap = await tx.get(projectRef);

    if (!snap.exists) {
      throw new ProjectNotFoundError(projectId);
    }

    const data = snap.data();

    if (!data) {
      throw new ProjectNotFoundError(projectId);
    }

    if (data.userId !== ownerId) {
      throw new AuthorizationError("Not your project");
    }
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

    if (!ref) throw new HttpsError("invalid-argument", "Invalid path");

    for (const subId of subcollectionIds) {
      const subcollection = ref.collection(subId);
      const docs = await subcollection.listDocuments();
      await Promise.all(docs.map((d) => d.delete()));
    }
  }
}
