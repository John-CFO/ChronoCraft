///////////////////////////// projectRepo.integration.ts /////////////////////////////

// Integration tests for ProjectRepo against Firestore emulator

//////////////////////////////////////////////////////////////////////////////////////

import { admin } from "../../../tests/firebaseAdminTest";
import {
  ProjectRepo,
  ProjectNotFoundError,
  UpdateProjectInput,
} from "../../../src/repos/projectRepo";

///////////////////////////////////////////////////////////////////////////////////////

const projectRepo = new ProjectRepo();

const userId = "test-user";
const serviceId = "test-service";

// Ensure Firestore emulator settings
const ensureFirestoreEmulator = () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error("FIRESTORE_EMULATOR_HOST is not set");
  }

  admin.firestore().settings({
    host: host.replace("http://", ""),
    ssl: false,
  });
};

ensureFirestoreEmulator();

//////////////////////////////////////////////////////////////////////////////////////////

describe("ProjectRepo Integration Tests", () => {
  let testProjectId: string;

  beforeEach(() => {
    testProjectId = `test-project-${Date.now()}-${Math.random()}`;
  });

  afterEach(async () => {
    try {
      await admin
        .firestore()
        .collection("Users")
        .doc(userId)
        .collection("Services")
        .doc(serviceId)
        .collection("Projects")
        .doc(testProjectId)
        .delete();
    } catch {
      // ignore
    }
  });

  it("should throw ProjectNotFoundError for non-existent project", async () => {
    const nonExistentId = "non-existent-project";

    await expect(
      projectRepo.updateProject(userId, serviceId, nonExistentId, {
        name: "Test",
        updatedAt: admin.firestore.Timestamp.now(),
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("should create and update a project", async () => {
    const firestore = admin.firestore();

    await firestore
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId)
      .collection("Projects")
      .doc(testProjectId)
      .set({
        id: testProjectId,
        userId,
        serviceId,
        name: "Initial Project",
        status: "active",
        isTracking: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

    const updateInput: UpdateProjectInput = {
      name: "Updated Project",
      updatedAt: admin.firestore.Timestamp.now(),
      isTracking: true,
    };

    await projectRepo.updateProject(
      userId,
      serviceId,
      testProjectId,
      updateInput,
    );

    const updatedDoc = await firestore
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId)
      .collection("Projects")
      .doc(testProjectId)
      .get();

    const data = updatedDoc.data();

    expect(data?.name).toBe("Updated Project");
    expect(data?.isTracking).toBe(true);
    expect(data?.updatedAt).toBeDefined();
  });

  it("should delete earnings document via setProjectHourlyRate flow", async () => {
    const firestore = admin.firestore();

    await firestore
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId)
      .collection("Projects")
      .doc(testProjectId)
      .set({
        id: testProjectId,
        userId,
        serviceId,
        name: "Initial Project",
        status: "active",
        isTracking: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

    await firestore.collection("Earnings").doc(testProjectId).set({
      hourlyRate: 50,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    await projectRepo.setProjectHourlyRate(userId, serviceId, testProjectId, {
      hourlyRate: 120,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const snap = await firestore
      .collection("Earnings")
      .doc(testProjectId)
      .get();

    expect(snap.exists).toBe(true);
  });

  it("should write earnings for project owner", async () => {
    const firestore = admin.firestore();

    await firestore
      .collection("Users")
      .doc(userId)
      .collection("Services")
      .doc(serviceId)
      .collection("Projects")
      .doc(testProjectId)
      .set({
        id: testProjectId,
        userId,
        serviceId,
        name: "Initial Project",
        status: "active",
        isTracking: false,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

    await projectRepo.setProjectHourlyRate(userId, serviceId, testProjectId, {
      hourlyRate: 100,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const snap = await firestore
      .collection("Earnings")
      .doc(testProjectId)
      .get();

    const data = snap.data();

    expect(data?.hourlyRate).toBe(100);
  });
});
