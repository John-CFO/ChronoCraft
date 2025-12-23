////////////////////////////// index.e2e.ts //////////////////////////////

// This file contains the E2E tests for the Firebase Functions

//////////////////////////////////////////////////////////////////////////

import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

//////////////////////////////////////////////////////////////////////////

type AuthValidatorResponse = { success: boolean };
type SecureDeleteResponse = { success: boolean };

// Nutze Emulator-Projekt-ID
const app = initializeApp({ projectId: "chrono-craft-worktime-manager" });
const functions = getFunctions(app, "http://127.0.0.1:5001");

describe("Firebase Functions E2E Tests", () => {
  const testUid = "test-user";
  const projectId = "test-project";
  const serviceId = "test-service";

  it("authValidator: login should succeed", async () => {
    const authValidator = httpsCallable<
      { action: string },
      AuthValidatorResponse
    >(functions, "authValidator");
    const res = await authValidator({ action: "login" });
    expect(res.data.success).toBe(true);
  });

  it("profileValidator: unauthenticated should fail", async () => {
    const profileValidator = httpsCallable(functions, "profileValidator");
    await expect(profileValidator({ displayName: "newName" })).rejects.toThrow(
      /unauthenticated/
    );
  });

  it("projectsAndWorkValidator: updateProject permission denied", async () => {
    const projectsAndWorkValidator = httpsCallable(
      functions,
      "projectsAndWorkValidator"
    );
    await expect(
      projectsAndWorkValidator({
        action: "updateProject",
        payload: { id: "some-id", userId: "wrong" },
      })
    ).rejects.toThrow(/permission-denied/);
  });

  it("secureDelete: only owner can delete", async () => {
    const secureDelete = httpsCallable(functions, "secureDelete");
    // Versuch mit falschem userId
    await expect(
      secureDelete({ userId: "other-user", serviceId, subs: ["sub1"] })
    ).rejects.toThrow(/permission-denied/);
  });

  it("secureDelete: owner can delete", async () => {
    const secureDelete = httpsCallable<
      { userId: string; serviceId: string; subs: string[] },
      SecureDeleteResponse
    >(functions, "secureDelete");
    const res = await secureDelete({ userId: testUid, serviceId, subs: [] });
    expect(res.data.success).toBe(true);
  });
});
