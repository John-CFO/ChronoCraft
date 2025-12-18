////////////////////////////// authLogic.test.ts /////////////////////////////

// This files tests the authValidatorLogic cloud function logic

//////////////////////////////////////////////////////////////////////////////

import {
  authValidatorLogic,
  __resetRateLimitMap,
} from "../../src/authValidator";

//////////////////////////////////////////////////////////////////////////////

// mock crypto
jest.mock("expo-crypto", () => ({
  digestStringAsync: jest.fn(async () => "mocked-hash"),
}));

describe("authValidatorLogic (unit)", () => {
  afterEach(() => {
    __resetRateLimitMap();
    jest.resetAllMocks();
  });

  it("throws when action missing", async () => {
    await expect(
      authValidatorLogic(undefined, undefined, { ip: "1.2.3.4" }, {})
    ).rejects.toThrow("Missing action");
  });

  it("allows login action", async () => {
    const res = await authValidatorLogic(
      { action: "login", payload: { email: "a@b.com", password: "x" } },
      undefined,
      { ip: "1.2.3.4" },
      {
        logEvent: jest.fn(),
      }
    );
    expect(res).toEqual({ success: true });
  });

  it("rate limits by ip after 21 requests", async () => {
    const deps = { logEvent: jest.fn() };
    for (let i = 0; i < 21; i++) {
      // first 21 calls: count goes 1..21 -> 21st should still pass because check is >20
      if (i < 21) {
        // ensure no throw
        await expect(
          authValidatorLogic(
            {
              action: "login",
              payload: { email: "user@example.com", password: "secret" },
            },
            undefined,
            { ip: "9.9.9.9" },
            deps
          )
        ).resolves.toBeDefined();
      }
    }
    // 22nd should fail (count > 20)
    await expect(
      authValidatorLogic(
        {
          action: "login",
          payload: { email: "user@example.com", password: "secret" },
        },
        undefined,
        { ip: "9.9.9.9" },
        deps
      )
    ).rejects.toThrow();
  });

  it("verifyTotp requires auth", async () => {
    await expect(
      authValidatorLogic(
        { action: "verifyTotp", payload: "123" },
        undefined,
        { ip: "1.1.1.1" },
        { logEvent: jest.fn() }
      )
    ).rejects.toThrow();
  });

  it("verifyTotp returns valid true when user has secret and token valid", async () => {
    const getUserDoc = jest.fn(async (uid: string) => ({
      exists: true,
      data: () => ({ totpSecret: "s" }),
    }));
    const deps = {
      getUserDoc,
      verifyToken: jest.fn(() => true),
      logEvent: jest.fn(),
    };
    const res = await authValidatorLogic(
      { action: "verifyTotp", payload: "123456" },
      "uid1",
      {},
      deps
    );
    expect(res).toEqual({ valid: true });
    expect(getUserDoc).toHaveBeenCalledWith("uid1");
  });

  it("verifyTotp returns valid false when verifyToken false", async () => {
    const getUserDoc = jest.fn(async (uid: string) => ({
      exists: true,
      data: () => ({ totpSecret: "s" }),
    }));
    const deps = {
      getUserDoc,
      verifyToken: jest.fn(() => false),
      logEvent: jest.fn(),
    };
    const res = await authValidatorLogic(
      { action: "verifyTotp", payload: "123456" },
      "uid1",
      {},
      deps
    );
    expect(res).toEqual({ valid: false });
  });

  it("verifyTotp throws when user doc missing", async () => {
    const getUserDoc = jest.fn(async () => ({
      exists: false,
      data: () => undefined,
    }));
    await expect(
      authValidatorLogic(
        { action: "verifyTotp", payload: "123" },
        "uid1",
        {},
        { getUserDoc, logEvent: jest.fn() }
      )
    ).rejects.toThrow();
  });
});
