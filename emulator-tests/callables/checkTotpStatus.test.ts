////////////////////////// checkTotpStatus.test.ts //////////////////////////

// This file contains the unit tests for the checkTotpStatus callable.

//////////////////////////////////////////////////////////////////////////////

import { describe, it, expect } from "vitest";
import { httpsCallable } from "firebase/functions";

import { functions } from "../setup";

//////////////////////////////////////////////////////////////////////////////

const checkTotpStatus = httpsCallable(functions, "checkTotpStatus");

describe("checkTotpStatus (unauthenticated)", () => {
  it("rejects unauthenticated calls", async () => {
    await expect(checkTotpStatus({})).rejects.toMatchObject({
      code: "functions/unauthenticated",
    });
  });
});
