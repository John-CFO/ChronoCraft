///////////////////////// profileValidatorLogic.test.ts /////////////////////////

// This file tests the logic for the profileValidator Cloud Function

/////////////////////////////////////////////////////////////////////////////////

import { profileValidatorLogic } from "../../src/profileValidator";

/////////////////////////////////////////////////////////////////////////////////

describe("profileValidatorLogic (unit)", () => {
  it("throws when not authenticated", async () => {
    const logEvent = jest.fn();

    await expect(
      profileValidatorLogic({ name: "x" }, undefined, {
        getUserDoc: async () => ({ exists: true, data: () => ({}) }),
        logEvent,
      })
    ).rejects.toThrow();

    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining("unauthorized"),
      "warn",
      expect.any(Object)
    );
  });

  it("updates profile when user exists and input valid", async () => {
    const getUserDoc = jest.fn(async (uid: string) => ({
      exists: true,
      data: () => ({ name: "old" }),
    }));
    const updateUser = jest.fn(
      async () => ({}) as FirebaseFirestore.WriteResult
    );
    const res = await profileValidatorLogic({ displayName: "New" }, "uid1", {
      getUserDoc,
      updateUser,
      logEvent: jest.fn(),
    });
    expect(res).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith("uid1", expect.any(Object));
  });

  it("throws when user not found", async () => {
    const getUserDoc = jest.fn(async () => ({
      exists: false,
      data: () => null,
    }));
    const logEvent = jest.fn();

    await expect(
      profileValidatorLogic({ displayName: "x" }, "uid1", {
        getUserDoc,
        updateUser: jest.fn(),
        logEvent,
      })
    ).rejects.toThrow();

    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining("user missing"),
      "warn",
      expect.any(Object)
    );
  });
});
