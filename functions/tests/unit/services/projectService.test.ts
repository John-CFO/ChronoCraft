/////////////////////// projectService.test.ts //////////////////////////////

// This file contains the unit tests for the ProjectService class.

/////////////////////////////////////////////////////////////////////////////

// mock dependencies first to avoid errors
jest.mock("../../../src/repos/projectRepo");
jest.mock("../../../src/utils/logger");

import { ProjectService } from "../../../src/services/projectService";
import { ProjectRepo } from "../../../src/repos/projectRepo";
import { ProjectNotFoundError } from "../../../src/repos/projectRepo";

//////////////////////////////////////////////////////////////////////////////

describe("ProjectService Unit Tests", () => {
  let service: ProjectService;
  let repo: jest.Mocked<ProjectRepo>;

  beforeEach(() => {
    repo = new ProjectRepo() as jest.Mocked<ProjectRepo>;
    service = new ProjectService();
    // focused Test-Injection
    // @ts-ignore
    service.projectRepo = repo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateProject", () => {
    it("should update project if user owns it", async () => {
      repo.getProjectById.mockResolvedValue({
        id: "project1",
        userId: "user123",
        name: "Test",
        status: "active",
        isTracking: false,
        createdAt: {} as any,
        updatedAt: {} as any,
      });

      repo.updateProject.mockResolvedValue(undefined);

      const result = await service.updateProject(
        "project1",
        { name: "New Name" },
        "user123"
      );

      expect(repo.updateProject).toHaveBeenCalledWith(
        "project1",
        expect.objectContaining({
          name: "New Name",
          updatedAt: expect.anything(),
        })
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw if project does not exist", async () => {
      repo.getProjectById.mockRejectedValue(
        new ProjectNotFoundError("project1")
      );

      await expect(
        service.updateProject("project1", {}, "user123")
      ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });

    it("should throw if project belongs to another user (IDOR)", async () => {
      repo.getProjectById.mockResolvedValue({
        id: "project1",
        userId: "attacker",
        name: "Test",
        status: "active",
        isTracking: false,
        createdAt: {} as any,
        updatedAt: {} as any,
      });

      await expect(
        service.updateProject("project1", {}, "user123")
      ).rejects.toThrow("Not your project");
    });
  });

  describe("setHourlyRate", () => {
    it("should set hourly rate", async () => {
      repo.setProjectHourlyRate.mockResolvedValue(undefined);

      const result = await service.setHourlyRate("user123", "project1", 50);

      expect(repo.setProjectHourlyRate).toHaveBeenCalledWith("project1", {
        hourlyRate: 50,
        updatedAt: expect.anything(),
      });

      expect(result).toEqual({ success: true });
    });

    it("should throw if repo fails", async () => {
      repo.setProjectHourlyRate.mockRejectedValue(new Error("DB error"));

      await expect(
        service.setHourlyRate("user123", "project1", 50)
      ).rejects.toThrow("DB error");
    });
  });
});
