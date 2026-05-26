//////////////////////// deleteUserData.race.test.ts ////////////////////////

// This file contains race condition tests for the deleteUserData function

//////////////////////////////////////////////////////////////////////////////

import "./setup";
import { deleteUserDataHandler } from "../../src/functions/deleteUserData.function";
import { admin } from "../firebaseAdminTest";
import { runRace } from "./hardness/raceRunner";
import { randomUUID } from "crypto";

/////////////////////////////////////////////////////////////////////////////

// fully isolated deterministic test IDs
const createUid = () => `race-delete-${randomUUID()}`;

const createAuthRequest = (uid: string) =>
  ({
    auth: { uid },
    data: {},
    rawRequest: {
      headers: {},
      socket: {},
    },
  }) as any;

const userRef = (uid: string) => admin.firestore().collection("Users").doc(uid);

const mfaRef = (uid: string) =>
  admin.firestore().collection("mfa_totp").doc(uid);

async function seedUserState(uid: string) {
  await userRef(uid).set({
    displayName: "race-user",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await mfaRef(uid).set({
    enabled: true,
    encryptedSecret: "dummy",
  });
}

//////////////////////////////////////////////////////////////////////////////

describe("Race Condition: deleteUserData - parallel delete storm", () => {
  it("must be idempotent under concurrent deletion", async () => {
    const uid = createUid();

    await seedUserState(uid);

    const results = await runRace({
      participants: 25,
      jitterMs: 20,
      operation: async () => {
        try {
          return await deleteUserDataHandler(createAuthRequest(uid));
        } catch (e) {
          return {
            success: false,
            error: e,
          };
        }
      },
    });

    const failures = results.filter((r) => !r.success);

    expect(failures).toHaveLength(0);

    const userDoc = await userRef(uid).get();
    const mfaDoc = await mfaRef(uid).get();

    expect(userDoc.exists).toBe(false);
    expect(mfaDoc.exists).toBe(false);
  }, 20000);
});

describe("Race Condition: deleteUserData - TOCTOU (update vs delete)", () => {
  it("must not allow resurrection or partial overwrite", async () => {
    const uid = createUid();

    await seedUserState(uid);

    const results = await runRace({
      participants: 20,
      jitterMs: 15,
      operation: async (i: number) => {
        if (i % 5 === 0) {
          try {
            await userRef(uid).update({
              displayName: `updated-${i}`,
            });
          } catch {}
        }

        try {
          return await deleteUserDataHandler(createAuthRequest(uid));
        } catch (e) {
          return {
            success: false,
            error: e,
          };
        }
      },
    });

    const failures = results.filter((r) => !r.success);

    expect(failures.length).toBe(0);

    const userDoc = await userRef(uid).get();
    const mfaDoc = await mfaRef(uid).get();

    expect(userDoc.exists).toBe(false);
    expect(mfaDoc.exists).toBe(false);
  }, 20000);
});

describe("Race Condition: deleteUserData - auth vs firestore deletion ordering", () => {
  it("must not leave dangling firestore state", async () => {
    const uid = createUid();

    await seedUserState(uid);

    const results = await runRace({
      participants: 15,
      jitterMs: 10,
      operation: async () => {
        try {
          return await deleteUserDataHandler(createAuthRequest(uid));
        } catch (e) {
          return {
            success: false,
            error: e,
          };
        }
      },
    });

    const failures = results.filter((r) => !r.success);

    expect(failures.length).toBe(0);

    const userDoc = await userRef(uid).get();
    const mfaDoc = await mfaRef(uid).get();

    expect(userDoc.exists).toBe(false);
    expect(mfaDoc.exists).toBe(false);
  }, 20000);
});
