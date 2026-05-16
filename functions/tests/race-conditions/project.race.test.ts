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
const projectId = "race-project";

// get project ref
const projectRef = () =>
  admin.firestore().collection("Projects").doc(projectId);

const seedProject = async () => {
  await projectRef().set(
    {
      userId: ownerUid,
      serviceId,
      name: "init",
      status: "active",
      isTracking: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
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

    await seedProject();

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

    const failed = (results as RaceResult[]).filter(
      (r) => !r.success && r.error?.code !== "aborted" && r.error?.code !== 10,
    );

    if (failed.length > 0) {
      throw new Error("Concurrent project update failed");
    }

    const raw = (await projectRef().get()).data();
    if (!isValidProjectState(raw)) {
      throw new Error("Invalid project state after concurrency");
    }
  }, 20000);
});

describe("Race Condition: mixed field updates", () => {
  it("must not produce partial or invalid document states", async () => {
    const service = new ProjectService();

    await seedProject();

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

    const raw = (await projectRef().get()).data();

    if (!raw) {
      throw new Error("Missing project data");
    }

    if (!raw.name.startsWith("name-") && !raw.name.startsWith("update-")) {
      throw new Error("Unexpected name state");
    }
  }, 20000);
});

describe("Race Condition: idempotent updates", () => {
  it("must remain stable under repeated identical writes", async () => {
    const service = new ProjectService();

    await seedProject();

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

    const raw = (await projectRef().get()).data();

    if (!isValidProjectState(raw)) {
      throw new Error("Invalid final state");
    }
  }, 20000);
});
