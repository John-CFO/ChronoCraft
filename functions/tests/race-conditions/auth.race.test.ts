///////////////////////// auth.race.test.ts //////////////////////////

// Race condition tests for authValidator / AuthService register-login flows

///////////////////////////////////////////////////////////////////////

import { CallableRequest } from "firebase-functions/v2/https";
import { admin } from "../firebaseAdminTest";

import { authValidatorHandler } from "../../src/functions/authValidator.function";
import { runRace } from "../race-conditions/hardness/raceRunner";

///////////////////////////////////////////////////////////////////////

jest.setTimeout(30000);
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
  await userRef(uid).set(
    {
      createdVia: "seed",
      displayName: "seed-user",
      personalNumber: "seed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

const clearUser = async (uid: string) => {
  await userRef(uid).delete();
};

describe("Race Condition: register vs register", () => {
  const uid = "race-register-uid";

  beforeEach(async () => {
    await clearUser(uid);
  });

  it("must be idempotent under concurrency when user does not exist yet", async () => {
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

    const data = doc.data();
    expect(data?.createdVia).toBe("auth");
  });
});

describe("Race Condition: login vs login", () => {
  const uid = "race-login-uid";

  beforeEach(async () => {
    await seedUser(uid);
  });

  it("all requests must succeed without side effects corruption", async () => {
    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async () => authValidatorHandler(createRequest("login", uid)),
    });

    const failed = results.filter((r) => !r.success);
    expect(failed.length).toBe(0);

    const doc = await userRef(uid).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.createdVia).toBe("seed");
  });
});

describe("Race Condition: login vs register", () => {
  const uid = "race-mixed-uid";

  beforeEach(async () => {
    await clearUser(uid);
  });

  it("must not create duplicate or inconsistent auth state", async () => {
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

    const data = doc.data();

    expect(data?.createdVia).toBe("auth");
  }, 20000);
});

describe("Race Condition: register on existing user", () => {
  const uid = "race-existing-uid";

  beforeEach(async () => {
    await seedUser(uid);
  });

  it("must be idempotent under concurrency when user already exists", async () => {
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
