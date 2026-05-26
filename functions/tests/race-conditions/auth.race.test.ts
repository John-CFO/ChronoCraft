///////////////////////// auth.race.test.ts //////////////////////////

// This file contains race condition tests for the authValidator function

///////////////////////////////////////////////////////////////////////////////

import { CallableRequest } from "firebase-functions/v2/https";

import "./setup";
import { admin } from "../firebaseAdminTest";
import { authValidatorHandler } from "../../src/functions/authValidator.function";
import { runRace } from "../race-conditions/hardness/raceRunner";
import { randomUUID } from "crypto";

///////////////////////////////////////////////////////////////////////////////

jest.setTimeout(30000);

// stable unique IDs
const createUid = (tag: string) => `race-auth-${tag}-${randomUUID()}`;

const createRequest = (
  action: "login" | "register",
  uid: string,
): CallableRequest =>
  ({
    data: { action },
    auth: { uid },
  }) as unknown as CallableRequest;

const userRef = (uid: string) => admin.firestore().collection("Users").doc(uid);

const seedUser = async (uid: string) => {
  await userRef(uid).set({
    createdVia: "seed",
    displayName: "seed-user",
    personalNumber: "seed",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const clearUser = async (uid: string) => {
  await userRef(uid)
    .delete()
    .catch(() => {});
};

///////////////////////////////////////////////////////////////////////////////

describe("Race Condition: register vs register", () => {
  it("must be idempotent under concurrency when user does not exist yet", async () => {
    const uid = createUid("register");

    await clearUser(uid);

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async () =>
        authValidatorHandler(createRequest("register", uid)),
    });

    const failed = results.filter((r) => !r.success);
    expect(failed.length).toBe(0);

    const doc = await userRef(uid).get();
    expect(doc.exists).toBe(true);
  });
});

describe("Race Condition: login vs login", () => {
  it("all requests must succeed without side effects corruption", async () => {
    const uid = createUid("login");

    await seedUser(uid);

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async () => authValidatorHandler(createRequest("login", uid)),
    });

    const failed = results.filter((r) => !r.success);
    expect(failed.length).toBe(0);

    const doc = await userRef(uid).get();
    expect(doc.exists).toBe(true);
  });
});

describe("Race Condition: login vs register", () => {
  it("must not create duplicate or inconsistent auth state", async () => {
    const uid = createUid("mixed");

    await clearUser(uid);

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async (index) => {
        const action = index % 2 === 0 ? "register" : "login";
        return authValidatorHandler(createRequest(action, uid));
      },
    });

    const failed = results.filter((r) => !r.success);
    expect(failed.length).toBe(0);

    const doc = await userRef(uid).get();
    expect(doc.exists).toBe(true);
  }, 20000);
});

describe("Race Condition: register on existing user", () => {
  it("must be idempotent under concurrency when user already exists", async () => {
    const uid = createUid("existing");

    await seedUser(uid);

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async () =>
        authValidatorHandler(createRequest("register", uid)),
    });

    const failed = results.filter((r) => !r.success);
    expect(failed.length).toBe(0);

    const doc = await userRef(uid).get();
    expect(doc.exists).toBe(true);
  });
});
