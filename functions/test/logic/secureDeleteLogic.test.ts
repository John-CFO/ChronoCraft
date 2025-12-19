////////////////////// secureDeleteLogic.test.ts /////////////////////////////

// This file tests the delete logic for the secureDelete Cloud Function

//////////////////////////////////////////////////////////////////////////////

import { secureDeleteLogic } from "../../src/secureDelete";

//////////////////////////////////////////////////////////////////////////////

describe("secureDeleteLogic (unit)", () => {
  it("throws and logs warn when not authenticated", async () => {
    const logEvent = jest.fn();

    await expect(
      secureDeleteLogic(
        { userId: "u", serviceId: "s", subs: ["a"] },
        undefined,
        { deleteSubcollections: jest.fn(), logEvent }
      )
    ).rejects.toThrow();

    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining("unauthenticated"),
      "warn",
      expect.any(Object)
    );
  });

  it("throws and logs warn when uid mismatch", async () => {
    const logEvent = jest.fn();

    await expect(
      secureDeleteLogic(
        { userId: "victim", serviceId: "s", subs: ["a"] },
        "attacker",
        { deleteSubcollections: jest.fn(), logEvent }
      )
    ).rejects.toThrow();

    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining("permission denied"),
      "warn",
      expect.any(Object)
    );
  });

  it("calls deleteSubcollections when authorized", async () => {
    const deleteSubcollections = jest.fn(async () => undefined);
    const res = await secureDeleteLogic(
      { userId: "uid1", serviceId: "svc", subs: ["a", "b"] },
      "uid1",
      { deleteSubcollections, logEvent: jest.fn() }
    );
    expect(res).toEqual({ success: true });
    expect(deleteSubcollections).toHaveBeenCalledWith(
      null,
      ["Users", "uid1", "Services", "svc"],
      ["a", "b"]
    );
  });
});
