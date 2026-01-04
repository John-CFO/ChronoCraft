/////////////////////////////// projectRepo.integration.ts //////////////////////////////

// This file contains the integration tests for the ProjectRepo class,
// which is used to interact with the Firestore database.

/////////////////////////////////////////////////////////////////////////////////////////

import * as admin from "firebase-admin";

import {
  ProjectRepo,
  ProjectNotFoundError,
  UpdateProjectInput,
} from "../../../src/repos/projectRepo";

/////////////////////////////////////////////////////////////////////////////////////////

describe("ProjectRepo Integration Tests", () => {
  let projectRepo: ProjectRepo;
  let testProjectId: string;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "test-project" });
    }

    projectRepo = new ProjectRepo();
  });

  beforeEach(() => {
    testProjectId = `test-project-${Date.now()}-${Math.random()}`;
  });

  afterEach(async () => {
    // call deleteProject
    try {
      await admin
        .firestore()
        .collection("Projects")
        .doc(testProjectId)
        .delete();
    } catch {
      // ignore if not existing
    }
  });

  it("should throw ProjectNotFoundError for non-existent project", async () => {
    const nonExistentId = "non-existent-project";
    await expect(
      projectRepo.updateProject(nonExistentId, {
        name: "Test",
        updatedAt: admin.firestore.Timestamp.now(),
      })
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("should create and update a project", async () => {
    const firestore = admin.firestore();

    // CREATE: set initial doc directly over Repo(or Firestore)
    await firestore.collection("Projects").doc(testProjectId).set({
      name: "Initial Project",
      updatedAt: admin.firestore.Timestamp.now(),
      isTracking: false, // initial
    });

    // ACT: call updateProject
    const updateInput: UpdateProjectInput = {
      name: "Updated Project",
      updatedAt: admin.firestore.Timestamp.now(),
      isTracking: true,
    };
    await projectRepo.updateProject(testProjectId, updateInput);

    // ASSERT
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
