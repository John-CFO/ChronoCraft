/////////////////////// projectRepo.ts ///////////////////////////////

// This file contains the implementation of the ProjectRepo class,
// which is used to interact with the Firestore database.

////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";

import {
  DomainError,
  AuthorizationError,
  ValidationError,
} from "../errors/domain.errors";

import { logEvent } from "../utils/logger";

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
    super(`Project not found: ${projectId}`, "not-found", "Project not found");
    this.name = "ProjectNotFoundError";
  }
}

// Repository
export class ProjectRepo {
  // Collections
  private readonly db = admin.firestore();

  // references
  private serviceRef(userId: string, serviceId: string) {
    return this.db
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId);
  }

  private projectsRef(userId: string, serviceId: string) {
    return this.serviceRef(userId, serviceId).collection("Projects");
  }

  // docs
  private projectDoc(userId: string, serviceId: string, projectId: string) {
    return this.projectsRef(userId, serviceId).doc(projectId);
  }

  private earningsDoc(projectId: string) {
    return this.db.collection("Earnings").doc(projectId);
  }

  private lockDoc(projectId: string) {
    return this.db.collection("deletionLocks").doc(projectId);
  }

  // Helper deleting
  async deleteCollectionRecursive(ref: FirebaseFirestore.CollectionReference) {
    const snap = await ref.get();

    const batch = this.db.batch();

    snap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  // Queries
  async getProjects(userId: string, serviceId: string) {
    const snap = await this.projectsRef(userId, serviceId).get();

    return {
      projects: snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })),
    };
  }

  async createProject(userId: string, name: string, serviceId: string) {
    const ref = this.projectsRef(userId, serviceId).doc();

    const data = {
      id: ref.id,
      userId,
      serviceId,
      name,
      status: "active",
      isTracking: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await ref.set(data);

    logEvent("project-created", "info", {
      userId,
      serviceId,
      projectId: ref.id,
    });

    return {
      projectId: ref.id,
      userId,
      serviceId,
    };
  }

  async updateProject(
    ownerId: string,
    serviceId: string,
    projectId: string,
    input: any,
  ) {
    const ref = this.projectDoc(ownerId, serviceId, projectId);
    const snap = await ref.get();

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

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new ValidationError("Invalid input");
    }

    await ref.update({
      ...input,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  async deleteProject(ownerId: string, serviceId: string, projectId: string) {
    const ref = this.projectDoc(ownerId, serviceId, projectId);
    const earningsRef = this.earningsDoc(projectId);
    const lockRef = this.lockDoc(projectId);
    const notesRef = ref.collection("Notes");

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const lockSnap = await tx.get(lockRef);

      if (!snap.exists) throw new ProjectNotFoundError(projectId);

      if (snap.data()?.userId !== ownerId) {
        throw new AuthorizationError("Not your project");
      }

      if (lockSnap.exists) {
        throw new HttpsError("failed-precondition", "Locked");
      }

      tx.set(lockRef, {
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        uid: ownerId,
        serviceId,
      });

      tx.delete(ref);
      tx.delete(earningsRef);
    });

    await this.deleteCollectionRecursive(notesRef);

    await lockRef.delete().catch(() => {});

    logEvent("project-deleted", "info", {
      ownerId,
      serviceId,
      projectId,
    });
  }

  async setProjectHourlyRate(
    ownerId: string,
    serviceId: string,
    projectId: string,
    input: any,
  ) {
    const ref = this.projectDoc(ownerId, serviceId, projectId);
    const earningsRef = this.earningsDoc(projectId);
    const lockRef = this.lockDoc(projectId);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const lockSnap = await tx.get(lockRef);

      if (!snap.exists) throw new ProjectNotFoundError(projectId);

      if (lockSnap.exists) {
        throw new HttpsError("failed-precondition", "Locked");
      }

      if (snap.data()?.userId !== ownerId) {
        throw new AuthorizationError("Not your project");
      }

      tx.set(earningsRef, input, { merge: true });
    });
  }
}
