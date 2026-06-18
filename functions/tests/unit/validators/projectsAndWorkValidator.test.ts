//////////////////////// projectsAndWorkValidator.test.ts //////////////////////////

// This file contains the unit tests for the projectsAndWorkValidator function.

////////////////////////////////////////////////////////////////////////////////////

// Mock the entire projectService module BEFORE importing the logic function
const mockUpdateProject = jest.fn();
const mockSetHourlyRate = jest.fn();

jest.mock("../../../src/services/projectService", () => {
  return {
    ProjectService: jest.fn().mockImplementation(() => ({
      updateProject: (...args: any[]) => mockUpdateProject(...args),
      setHourlyRate: (...args: any[]) => mockSetHourlyRate(...args),
    })),
  };
});

/////////////////////////////////////////////////////////////////////////////////////

import { CallableRequest } from "firebase-functions/v2/https";
import { projectsAndWorkValidatorLogic } from "../../../src/functions/projectAndWorkValidator.logic";

/////////////////////////////////////////////////////////////////////////////////////

describe("projectsAndWorkValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProject.mockClear();
    mockSetHourlyRate.mockClear();
  });

  // NOTE: This shape matches Firebase v5 CallableRequest
  const makeRequest = (
    data: any,
    auth?: { uid: string } | null,
  ): CallableRequest<any> => {
    return {
      data,
      auth: auth ?? null,
      rawRequest: {} as any,
    } as CallableRequest<any>;
  };

  it("rejects unauthenticated requests", async () => {
    await expect(
      projectsAndWorkValidatorLogic(makeRequest({}, null)),
    ).rejects.toThrow("Not logged in");
  });

  it("rejects missing action", async () => {
    await expect(
      projectsAndWorkValidatorLogic(makeRequest({}, { uid: "u1" })),
    ).rejects.toThrow("Missing action");
  });

  it("routes updateProject correctly", async () => {
    mockUpdateProject.mockResolvedValue({ success: true });

    const result = await projectsAndWorkValidatorLogic(
      makeRequest(
        {
          action: "updateProject",
          payload: {
            projectId: "p1",
            serviceId: "s1",
            name: "New Name",
          },
        },
        { uid: "u1" },
      ),
    );

    expect(mockUpdateProject).toHaveBeenCalledWith("u1", "s1", "p1", {
      projectId: "p1",
      serviceId: "s1",
      name: "New Name",
    });
    expect(result).toEqual({ success: true });
  });

  it("routes setHourlyRate correctly", async () => {
    mockSetHourlyRate.mockResolvedValue({ success: true });

    const result = await projectsAndWorkValidatorLogic(
      makeRequest(
        {
          action: "setHourlyRate",
          payload: { serviceId: "s1", projectId: "p1", rate: 50 },
        },
        { uid: "u1" },
      ),
    );

    expect(mockSetHourlyRate).toHaveBeenCalledWith("u1", "s1", "p1", 50);
    expect(result).toEqual({ success: true });
  });

  it("propagates updateProject errors", async () => {
    mockUpdateProject.mockRejectedValue(new Error("DB error"));

    await expect(
      projectsAndWorkValidatorLogic(
        makeRequest(
          {
            action: "updateProject",
            payload: {
              projectId: "p1",
              serviceId: "s1",
              name: "New Name",
            },
          },
          { uid: "u1" },
        ),
      ),
    ).rejects.toThrow("Internal server error.");
  });

  it("propagates setHourlyRate errors", async () => {
    mockSetHourlyRate.mockRejectedValue(new Error("DB error"));

    await expect(
      projectsAndWorkValidatorLogic(
        makeRequest(
          {
            action: "setHourlyRate",
            payload: { serviceId: "s1", projectId: "p1", rate: 50 },
          },
          { uid: "u1" },
        ),
      ),
    ).rejects.toThrow("Internal server error.");
  });

  it("rejects unknown action", async () => {
    await expect(
      projectsAndWorkValidatorLogic(
        makeRequest({ action: "deleteAll" }, { uid: "u1" }),
      ),
    ).rejects.toThrow("Unknown action");
  });
});
