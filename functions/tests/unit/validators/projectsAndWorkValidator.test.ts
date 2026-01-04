//////////////////////// projectsAndWorkValidator.test.ts //////////////////////////

// This file contains the unit tests for the projectsAndWorkValidator function.

////////////////////////////////////////////////////////////////////////////////////

// Mock the entire projectService module BEFORE importing the logic function
const mockUpdateProject = jest.fn();
const mockSetHourlyRate = jest.fn();

jest.mock("../../../src/services/projectService", () => {
  return {
    ProjectService: jest.fn(() => ({
      updateProject: mockUpdateProject,
      setHourlyRate: mockSetHourlyRate,
    })),
  };
});

/////////////////////////////////////////////////////////////////////////////////////

import { projectsAndWorkValidatorLogic } from "../../../src/functions/projectAndWorkValidator.logic";

/////////////////////////////////////////////////////////////////////////////////////

describe("projectsAndWorkValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProject.mockClear();
    mockSetHourlyRate.mockClear();
  });

  const makeRequest = (data: any, auth?: { uid: string } | null) => ({
    data,
    auth,
  });

  it("rejects unauthenticated requests", async () => {
    await expect(
      projectsAndWorkValidatorLogic(makeRequest({}, null))
    ).rejects.toThrow("Not logged in");
  });

  it("rejects missing action", async () => {
    await expect(
      projectsAndWorkValidatorLogic(makeRequest({}, { uid: "u1" }))
    ).rejects.toThrow("Missing action");
  });

  it("routes updateProject correctly", async () => {
    mockUpdateProject.mockResolvedValue({ success: true });

    const result = await projectsAndWorkValidatorLogic(
      makeRequest(
        { action: "updateProject", payload: { id: "p1", name: "New Name" } },
        { uid: "u1" }
      )
    );

    expect(mockUpdateProject).toHaveBeenCalledWith(
      "p1",
      { id: "p1", name: "New Name" },
      "u1"
    );
    expect(result).toEqual({ success: true });
  });

  it("routes setHourlyRate correctly", async () => {
    mockSetHourlyRate.mockResolvedValue({ success: true });

    const result = await projectsAndWorkValidatorLogic(
      makeRequest(
        { action: "setHourlyRate", payload: { projectId: "p1", rate: 50 } },
        { uid: "u1" }
      )
    );

    expect(mockSetHourlyRate).toHaveBeenCalledWith("u1", "p1", {
      projectId: "p1",
      rate: 50,
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects unknown action", async () => {
    await expect(
      projectsAndWorkValidatorLogic(
        makeRequest({ action: "deleteAll" }, { uid: "u1" })
      )
    ).rejects.toThrow("Unknown action");
  });
});
