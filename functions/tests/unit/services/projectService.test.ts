/////////////////////// projectService.test.ts //////////////////////////////

jest.mock("../../../src/repos/projectRepo");
jest.mock("../../../src/utils/logger");

import { ProjectService } from "../../../src/services/projectService";
import { ProjectRepo } from "../../../src/repos/projectRepo";

//////////////////////////////////////////////////////////////////////////////

describe("ProjectService Unit Tests", () => {
  let service: ProjectService;
  let repo: jest.Mocked<ProjectRepo>;

  beforeEach(() => {
    repo = new ProjectRepo() as jest.Mocked<ProjectRepo>;
    service = new ProjectService();

    // DI override
    // @ts-ignore
    service.projectRepo = repo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateProject", () => {
    it("should update project if user owns it", async () => {
      repo.updateProject.mockResolvedValue(undefined);

      const result = await service.updateProject(
        "user123",
        "serviceId",
        "project1",
        { name: "New Name" },
      );

      expect(repo.updateProject).toHaveBeenCalledWith(
        "user123",
        "project1",
        expect.objectContaining({
          name: "New Name",
          updatedAt: expect.anything(),
        }),
      );

      expect(result).toBeUndefined();
    });

    it("should throw if input is invalid (missing ids)", async () => {
      await expect(
        service.updateProject("", "serviceId", "user123", {}),
      ).rejects.toThrow("Invalid input");

      await expect(
        service.updateProject("project1", "", "user123", {}),
      ).rejects.toThrow("Invalid input");

      await expect(
        service.updateProject("project1", "serviceId", "", {}),
      ).rejects.toThrow("Invalid input");
    });
  });

  describe("setHourlyRate", () => {
    it("should set hourly rate", async () => {
      repo.setProjectHourlyRate.mockResolvedValue(undefined);

      const result = await service.setHourlyRate("user123", "project1", 50);

      expect(repo.setProjectHourlyRate).toHaveBeenCalledWith(
        "project1",
        expect.objectContaining({
          hourlyRate: 50,
          updatedAt: expect.anything(),
        }),
      );

      expect(result).toBeUndefined();
    });

    it("should throw if repo fails", async () => {
      repo.setProjectHourlyRate.mockRejectedValue(new Error("DB error"));

      await expect(
        service.setHourlyRate("user123", "project1", 50),
      ).rejects.toThrow("DB error");
    });

    it("should throw on invalid input", async () => {
      await expect(service.setHourlyRate("", "project1", 50)).rejects.toThrow(
        "Invalid input",
      );

      await expect(
        service.setHourlyRate("user123", "project1", NaN),
      ).rejects.toThrow("Invalid input");
    });
  });
});
