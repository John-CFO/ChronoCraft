///////////////////////// createTotpSecret.test.ts //////////////////////////

// This file contains the unit tests for the createTotpSecret callable.

//////////////////////////////////////////////////////////////////////////////

import { beforeAll, describe, expect, it } from "vitest";
import { httpsCallable } from "firebase/functions";
import { getIdToken } from "firebase/auth";

import { functions, auth, ensureTestUser } from "../setup";

//////////////////////////////////////////////////////////////////////////////

describe("createTotpSecret", () => {
  beforeAll(async () => {
    await ensureTestUser();
    await new Promise((r) => setTimeout(r, 300));
  });

  it("should return a secret", async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const token = await getIdToken(user);

    const fn = httpsCallable(functions, "createTotpSecret");
    const res = await fn({ token });

    expect(res.data).toHaveProperty("otpAuthUrl");
    expect(res.data).toHaveProperty("enrollmentId");
    expect(res.data).toHaveProperty("message");
  });
});
