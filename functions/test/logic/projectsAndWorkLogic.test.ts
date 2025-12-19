////////////////////// projectsAndWorkValidator.test.ts /////////////////////////

// This file tests the logic for the projectsAndWorkValidator Cloud Function

/////////////////////////////////////////////////////////////////////////////////

import { projectsAndWorkLogic } from "../../src/projectsAndWorkValidator";

////////////////////////////////////////////////////////////////////////////////

describe("projectsAndWorkLogic (unit)", () => {
  it("throws and logs warn when not authenticated", async () => {
    const logEvent = jest.fn();

    await expect(
      projectsAndWorkLogic(
        { action: "updateProject", payload: {} },
        undefined,
        { logEvent }
      )
    ).rejects.toThrow();

    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining("unauthorized"),
      "warn",
      expect.any(Object)
    );
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

  it("updateProject rejects and logs warn when user is not owner", async () => {
    const getProjectDoc = jest.fn(async () => ({
      exists: true,
      data: () => ({ userId: "owner" }),
    }));
    const logEvent = jest.fn();

    await expect(
      projectsAndWorkLogic(
        { action: "updateProject", payload: { id: "proj1" } },
        "attacker",
        { getProjectDoc, updateProject: jest.fn(), logEvent }
      )
    ).rejects.toThrow();

    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining("unauthorized"),
      "warn",
      expect.any(Object)
    );
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
