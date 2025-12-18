////////////////////// projectsAndWorkValidator.test.ts /////////////////////////

// This file tests the logic for the projectsAndWorkValidator Cloud Function

/////////////////////////////////////////////////////////////////////////////////

import { projectsAndWorkLogic } from "../../src/projectsAndWorkValidator";

////////////////////////////////////////////////////////////////////////////////

describe("projectsAndWorkLogic (unit)", () => {
  it("throws when not authenticated", async () => {
    await expect(
      projectsAndWorkLogic(
        { action: "updateProject", payload: {} },
        undefined,
        {}
      )
    ).rejects.toThrow();
  });

  it("updateProject succeeds when owner matches", async () => {
    const getProjectDoc = jest.fn(async (id: string) => ({
      exists: true,
      data: () => ({ userId: "uid1" }),
    }));
    const updateProject = jest.fn(
      async () => ({}) as FirebaseFirestore.WriteResult
    );
    const res = await projectsAndWorkLogic(
      { action: "updateProject", payload: { id: "proj1", name: "New name" } },
      "uid1",
      { getProjectDoc, updateProject, logEvent: jest.fn() }
    );
    expect(res).toEqual({ success: true });
    expect(updateProject).toHaveBeenCalledWith("proj1", expect.any(Object));
  });

  it("updateProject rejects when not owner", async () => {
    const getProjectDoc = jest.fn(async (id: string) => ({
      exists: true,
      data: () => ({ userId: "owner" }),
    }));
    await expect(
      projectsAndWorkLogic(
        { action: "updateProject", payload: { id: "proj1" } },
        "attacker",
        { getProjectDoc, updateProject: jest.fn(), logEvent: jest.fn() }
      )
    ).rejects.toThrow();
  });

  it("setHourlyRate sets rate", async () => {
    const setRate = jest.fn(async () => ({}) as FirebaseFirestore.WriteResult);
    const res = await projectsAndWorkLogic(
      {
        action: "setHourlyRate",
        payload: { userId: "uid1", projectId: "proj1", hourlyRate: 42 },
      },
      "uid1",
      { setRate, logEvent: jest.fn() }
    );
    expect(res).toEqual({ success: true });
    expect(setRate).toHaveBeenCalledWith(
      "uid1_proj1",
      expect.objectContaining({ hourlyRate: 42 })
    );
  });
});
