///////////////////////////// projectRepo.integration.ts /////////////////////////////

// Integration tests for ProjectRepo against Firestore emulator

//////////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import {
  ProjectRepo,
  ProjectNotFoundError,
  UpdateProjectInput,
} from "../../../src/repos/projectRepo";

///////////////////////////////////////////////////////////////////////////////////////

const projectRepo = new ProjectRepo();

// Init admin with projectId (important for emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "test-project",
  });
}

// Ensure Firestore emulator settings
const ensureFirestoreEmulator = () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run tests with `firebase emulators:exec`.",
    );
  }

  admin.firestore().settings({
    host: host.replace("http://", ""),
    ssl: false,
  });
};

ensureFirestoreEmulator();

describe("ProjectRepo Integration Tests", () => {
  let testProjectId: string;

  beforeEach(() => {
    testProjectId = `test-project-${Date.now()}-${Math.random()}`;
  });

  afterEach(async () => {
    try {
      await admin
        .firestore()
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
      projectRepo.updateProject(nonExistentId, {
        name: "Test",
        updatedAt: admin.firestore.Timestamp.now(),
      } as UpdateProjectInput),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("should create and update a project", async () => {
    const firestore = admin.firestore();

    await firestore.collection("Projects").doc(testProjectId).set({
      name: "Initial Project",
      updatedAt: admin.firestore.Timestamp.now(),
      isTracking: false,
    });

    const updateInput: UpdateProjectInput = {
      name: "Updated Project",
      updatedAt: admin.firestore.Timestamp.now(),
      isTracking: true,
    };

    await projectRepo.updateProject(testProjectId, updateInput);

    const updatedDoc = await firestore
      .collection("Projects")
      .doc(testProjectId)
      .get();

    const data = updatedDoc.data();

    expect(data?.name).toBe("Updated Project");
    expect(data?.isTracking).toBe(true);
    expect(data?.updatedAt).toBeDefined();
  });
});
