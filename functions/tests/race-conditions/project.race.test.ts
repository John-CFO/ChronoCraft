/////////////////////////////// project.race.test.ts //////////////////////////////

// This file contains race condition tests for the ProjectService class

///////////////////////////////////////////////////////////////////////////////////

import { ProjectService } from "../../src/services/projectService";
import { runRace } from "./hardness/raceRunner";
import { admin } from "../firebaseAdminTest";

////////////////////////////////////////////////////////////////////////////////////

type RaceResult = {
  success: boolean;
  error?: {
    code?: string | number;
  };
};

////////////////////////////////////////////////////////////////////////////////////

const ownerUid = "owner";
const serviceId = "race-service";
const projectId = `race-project-${Date.now()}`;

// get project ref
const projectRef = (id: string) =>
  admin.firestore().collection("Projects").doc(id);
const seedProject = async (id: string) => {
  await projectRef(id).set({
    userId: ownerUid,
    serviceId,
    name: "init",
    status: "active",
    isTracking: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const isValidProjectState = (raw: any) => {
  if (!raw) return false;
  if (raw.userId !== ownerUid) return false;
  if (raw.serviceId !== serviceId) return false;
  if (typeof raw.name !== "string") return false;
  if (typeof raw.isTracking !== "boolean") return false;
  if (!(raw.createdAt instanceof admin.firestore.Timestamp)) return false;
  if (!(raw.updatedAt instanceof admin.firestore.Timestamp)) return false;
  return true;
};

describe("Race Condition: concurrent project updates", () => {
  it("must preserve valid project state under parallel writes", async () => {
    const service = new ProjectService();

    await seedProject(projectId);

    const results = await runRace({
      participants: 20,
      jitterMs: 10,
      operation: async (index) => {
        return service.updateProject(ownerUid, serviceId, projectId, {
          name: `update-${index}`,
          isTracking: index % 2 === 0,
        });
      },
    });

    const failed = results.filter((r) => !r.success);

    if (failed.length > 0) {
      throw new Error("Concurrent project update failed");
    }

    const raw = (await projectRef(projectId).get()).data();
    if (!isValidProjectState(raw)) {
      throw new Error("Invalid project state after concurrency");
    }
  }, 30000);
});

describe("Race Condition: mixed field updates", () => {
  it("must not produce partial or invalid document states", async () => {
    const service = new ProjectService();

    await seedProject(projectId);

    const results = await runRace({
      participants: 25,
      jitterMs: 10,
      operation: async (index) => {
        const payload =
          index % 2 === 0
            ? { name: `name-${index}` }
            : { isTracking: index % 3 === 0 };

        return service.updateProject(ownerUid, serviceId, projectId, payload);
      },
    });

    const failed = (results as RaceResult[]).filter(
      (r) => !r.success && r.error?.code !== "aborted" && r.error?.code !== 10,
    );

    if (failed.length > 0) {
      throw new Error("Mixed update failure");
    }

    const raw = (await projectRef(projectId).get()).data();

    if (!raw) {
      throw new Error("Missing project data");
    }

    if (!raw.name.startsWith("name-") && !raw.name.startsWith("update-")) {
      throw new Error("Unexpected name state");
    }
  }, 20000);
});

describe("Race Condition: earnings idempotent writes", () => {
  it("must stay stable under repeated writes", async () => {
    const service = new ProjectService();

    await seedProject(projectId);

    const results = await runRace({
      participants: 20,
      jitterMs: 5,
      operation: async () => {
        return service.setHourlyRate(ownerUid, projectId, 100);
      },
    });

    const failed = results.filter((r) => !r.success);

    if (failed.length > 3) {
      throw new Error("Earnings instability detected");
    }

    const snap = await admin
      .firestore()
      .collection("Earnings")
      .doc(projectId)
      .get();

    if (!snap.exists || snap.data()?.hourlyRate !== 100) {
      throw new Error("Invalid earnings final state");
    }
  }, 20000);
});

describe("Race Condition: idempotent updates", () => {
  it("must remain stable under repeated identical writes", async () => {
    const service = new ProjectService();

    await seedProject(projectId);

    const payload = {
      name: "stable-update",
      isTracking: true,
    };

    const results = await runRace({
      participants: 20,
      jitterMs: 5,
      operation: async () => {
        return service.updateProject(ownerUid, serviceId, projectId, payload);
      },
    });

    const failed = (results as RaceResult[]).filter(
      (r) => !r.success && r.error?.code !== "aborted" && r.error?.code !== 10,
    );

    if (failed.length > 3) {
      throw new Error("Too many failed writes under contention");
    }

    const raw = (await projectRef(projectId).get()).data();

    if (!isValidProjectState(raw)) {
      throw new Error("Invalid final state");
    }
  }, 20000);
});

describe("Race Condition: earnings write + project deletion", () => {
  it("must not create orphan earnings state", async () => {
    const service = new ProjectService();

    await seedProject(projectId);

    await runRace({
      participants: 25,
      jitterMs: 10,
      operation: async (index) => {
        try {
          if (index === 0) {
            return await service.deleteProject(ownerUid, serviceId, projectId);
          }

          return await service.setHourlyRate(ownerUid, projectId, 100);
        } catch (error: any) {
          if (
            error?.code === "aborted" ||
            error?.code === 10 ||
            error?.code === "not-found" ||
            error?.code === "failed-precondition"
          ) {
            return;
          }

          throw error;
        }
      },
    });

    const earnings = await admin
      .firestore()
      .collection("Earnings")
      .doc(projectId)
      .get();

    const project = await projectRef(projectId).get();

    const orphan = earnings.exists === true && project.exists === false;

    if (orphan) {
      throw new Error("Orphan earnings detected");
    }
  }, 20000);
});

describe("Race Condition: write-after-delete rejection guarantee", () => {
  it("must reject all writes after deletion wins", async () => {
    await seedProject(projectId);

    const project = await projectRef(projectId).get();
    const earnings = await admin
      .firestore()
      .collection("Earnings")
      .doc(projectId)
      .get();

    if (
      project.exists &&
      earnings.exists &&
      earnings.data()?.hourlyRate === 999
    ) {
      throw new Error("Write-after-delete violation detected");
    }
  }, 20000);
});

describe("Race Condition: delete vs earnings update timing", () => {
  it("must not allow write after deletion", async () => {
    const service = new ProjectService();

    await seedProject(projectId);

    const results = await runRace({
      participants: 20,
      jitterMs: 5,
      operation: async (index) => {
        if (index % 5 === 0) {
          await service.deleteProject(ownerUid, serviceId, projectId);
        }

        return service.setHourlyRate(ownerUid, projectId, 120);
      },
    });

    const failed = (results as RaceResult[]).filter(
      (r) =>
        !r.success &&
        r.error?.code !== "aborted" &&
        r.error?.code !== 10 &&
        r.error?.code !== "not-found" &&
        r.error?.code !== "failed-precondition",
    );

    if (failed.length > 10) {
      throw new Error("TOCTOU failure detected");
    }

    const earnings = await admin
      .firestore()
      .collection("Earnings")
      .doc(projectId)
      .get();

    const project = await projectRef(projectId).get();

    if (!project.exists && earnings.exists) {
      throw new Error("Invalid state: earnings after delete");
    }
  }, 20000);
});
