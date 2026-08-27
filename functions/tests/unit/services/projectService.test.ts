/////////////////////// projectService.test.ts //////////////////////////////

// mocking
jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      }),
    }),
  }),
}));

jest.mock("../../../src/repos/projectRepo");
jest.mock("../../../src/utils/logger");

//////////////////////////////////////////////////////////////////////////////

import { ProjectService } from "../../../src/services/projectService";
import { ProjectRepo } from "../../../src/repos/projectRepo";

//////////////////////////////////////////////////////////////////////////////

describe("ProjectService Unit Tests", () => {
  let service: ProjectService;
  let repo: jest.Mocked<ProjectRepo>;

  const request = {
    data: {
      language: "en",
    },
  };

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
        request,
      );

      expect(repo.updateProject).toHaveBeenCalledWith(
        "user123",
        "serviceId",
        "project1",
        expect.objectContaining({
          name: "New Name",
          updatedAt: expect.anything(),
        }),
      );

      expect(result).toBeUndefined();
    });

    it("propagates repo error on updateProject", async () => {
      repo.updateProject.mockRejectedValue(new Error("DB error"));

      await expect(
        service.updateProject("user123", "serviceId", "project1", request, {
          name: "New Name",
        }),
      ).rejects.toThrow("DB error");
    });

    it("should throw if input is invalid (missing ids)", async () => {
      await expect(
        service.updateProject("", "serviceId", "user123", request, {}),
      ).rejects.toThrow("Invalid input");

      await expect(
        service.updateProject("project1", "", "user123", request, {}),
      ).rejects.toThrow("Invalid input");

      await expect(
        service.updateProject("project1", "serviceId", "", request, {}),
      ).rejects.toThrow("Invalid input");
    });
  });

  describe("setHourlyRate", () => {
    it("should set hourly rate", async () => {
      repo.setProjectHourlyRate.mockResolvedValue(undefined);

      const result = await service.setHourlyRate(
        "user123",
        "service1",
        "project1",
        50,
        request,
      );

      expect(repo.setProjectHourlyRate).toHaveBeenCalledWith(
        "user123",
        "service1",
        "project1",
        expect.objectContaining({
          hourlyRate: 50,
          updatedAt: expect.anything(),
        }),
      );

      expect(result).toBeUndefined();
    });

    it("propagates repo error on setHourlyRate", async () => {
      repo.setProjectHourlyRate.mockRejectedValue(new Error("DB error"));

      await expect(
        service.setHourlyRate("user123", "service1", "project1", 50, request),
      ).rejects.toThrow("DB error");
    });

    it("should throw if repo fails", async () => {
      repo.setProjectHourlyRate.mockRejectedValue(new Error("DB error"));

      await expect(
        service.setHourlyRate("user123", "service1", "project1", 50, request),
      ).rejects.toThrow("DB error");
    });

    it("should throw on invalid input", async () => {
      await expect(
        service.setHourlyRate("", "service1", "project1", 50, request),
      ).rejects.toThrow("Invalid input");

      await expect(
        service.setHourlyRate("user123", "service1", "project1", NaN, request),
      ).rejects.toThrow("Invalid input");
    });
  });
});
