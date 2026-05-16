/////////////////////////// profile.race.test.ts /////////////////////////////

// This file contains race condition tests for the ProfileService class

///////////////////////////////////////////////////////////////////////////////

import { admin } from "../firebaseAdminTest";
import { UserRepo } from "../../src/repos/userRepo";
import { ProfileService } from "../../src/services/profileService";
import { runRace } from "./hardness/raceRunner";

///////////////////////////////////////////////////////////////////////////////

jest.setTimeout(30000);
const uid = "race-test-uid";

const seedUser = async () => {
  const ref = admin.firestore().collection("Users").doc(uid);

  await ref.set(
    {
      displayName: "initial",
      personalNumber: "0",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
};

beforeEach(async () => {
  await seedUser();
});

describe("Race Condition: profile concurrent updates", () => {
  it("must not result in corrupted profile state under parallel writes", async () => {
    const service = new ProfileService();

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async (index) => {
        return service.updateProfile(uid, {
          displayName: `user-${index}`,
          personalNumber: `${index}`,
        });
      },
    });

    const failed = results.filter((r) => !r.success);

    expect(failed.length).toBe(0);

    const user = (await new UserRepo().getUser(uid)).data();

    if (!user) {
      throw new Error("User document missing after race execution");
    }

    expect(typeof user.displayName).toBe("string");
    expect(typeof user.personalNumber).toBe("string");

    expect(user.displayName.length).toBeGreaterThan(0);
    expect(user.personalNumber.length).toBeGreaterThan(0);
  });

  it("must preserve valid field types under concurrent partial updates", async () => {
    const service = new ProfileService();

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async (index) => {
        if (index % 2 === 0) {
          return service.updateProfile(uid, {
            displayName: `name-${index}`,
          });
        }

        return service.updateProfile(uid, {
          personalNumber: `${index}`,
        });
      },
    });

    const failed = results.filter((r) => !r.success);

    expect(failed.length).toBe(0);

    const user = (await new UserRepo().getUser(uid)).data();

    if (!user) {
      throw new Error("Missing user after race");
    }

    expect(typeof user.displayName).toBe("string");
    expect(typeof user.personalNumber).toBe("string");

    expect(user.displayName.length).toBeGreaterThan(0);
    expect(user.personalNumber.length).toBeGreaterThan(0);
  });

  it("must reject invalid concurrent payloads without corrupting persisted state", async () => {
    const service = new ProfileService();

    const results = await runRace({
      participants: 20,
      jitterMs: 25,
      operation: async (index) => {
        if (index % 2 === 0) {
          return service.updateProfile(uid, {
            displayName: `valid-${index}`,
          });
        }

        return service.updateProfile(uid, {
          displayName: "",
        });
      },
    });

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    expect(successful.length).toBeGreaterThan(0);
    expect(failed.length).toBeGreaterThan(0);

    const user = (await new UserRepo().getUser(uid)).data();

    if (!user) {
      throw new Error("Missing user after race");
    }

    expect(typeof user.displayName).toBe("string");
    expect(user.displayName.length).toBeGreaterThan(0);
  });
});
