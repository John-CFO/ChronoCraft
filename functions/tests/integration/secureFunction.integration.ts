///////////////////////////// secureFunction.integration.ts //////////////////////////

// This file contains the integration tests for the secureFunction wrapper in securty.ts

//////////////////////////////////////////////////////////////////////////////////////

import { secureFunction } from "../../src/functions/security";

//////////////////////////////////////////////////////////////////////////////////////

jest.mock("firebase-functions/v2/https", () => ({
  onCall: (fn: any) => fn,
}));

//////////////////////////////////////////////////////////////////////////////////////

describe("secureFunction (integration)", () => {
  it("should allow execution when auth is present", async () => {
    const wrapped = secureFunction(
      async (req: any) => {
        return { ok: true, uid: req.auth.uid };
      },
      { requireAuth: true },
    );

    const result = await wrapped({
      auth: { uid: "user1" },
      data: {},
      rawRequest: { headers: {} },
    } as any);

    expect(result.ok).toBe(true);
    expect(result.uid).toBe("user1");
  });

  it("should block unauthenticated access", async () => {
    const wrapped = secureFunction(async () => ({ ok: true }), {
      requireAuth: true,
    });

    await expect(
      wrapped({
        auth: null,
        data: {},
        rawRequest: { headers: {} },
      } as any),
    ).rejects.toThrow();
  });
});
