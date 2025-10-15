////////////////FirestoreService.sec.test.ts/////////////////////

// This file tests the AppSec-relevante Logik von FirestoreService

////////////////////////////////////////////////////////////////

import { doc, updateDoc } from "firebase/firestore";

import {
  updateProjectData,
  isValidProjectId,
} from "../components/FirestoreService";

////////////////////////////////////////////////////////////////

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({ mockDoc: true })),
  updateDoc: jest.fn(),
}));

// mock firebaseConfig module for tests (mutable)
jest.mock("../firebaseConfig", () => ({
  FIREBASE_AUTH: { currentUser: { uid: "test-uid" } },
  FIREBASE_FIRESTORE: {},
}));

////////////////////////////////////////////////////////////////

describe("FirestoreService — AppSec validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ensure default authenticated user
    const cfg = require("../firebaseConfig");
    cfg.FIREBASE_AUTH.currentUser = { uid: "test-uid" };
  });

  it("rejects unauthenticated attempts", async () => {
    const cfg = require("../firebaseConfig");
    cfg.FIREBASE_AUTH.currentUser = null;
    const ok = await updateProjectData("proj1", { name: "X" });
    expect(ok).toBe(false);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("rejects invalid projectId with slash (path injection)", async () => {
    const ok = await updateProjectData("bad/id", { name: "X" });
    expect(ok).toBe(false);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("rejects payload with unknown fields (strict schema)", async () => {
    const payload = { name: "Valid", __proto__: { admin: true }, evil: "x" };
    const ok = await updateProjectData("proj1", payload);
    expect(ok).toBe(false);
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it("accepts valid payload and calls updateDoc with sanitized data", async () => {
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    const payload = { name: "Project A", archived: false };
    const ok = await updateProjectData("proj-ok", payload);
    expect(ok).toBe(true);
    expect(doc).toHaveBeenCalled(); // doc path built
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), payload);
  });

  it("returns false on Firestore error", async () => {
    (updateDoc as jest.Mock).mockRejectedValue(new Error("db fail"));
    const ok = await updateProjectData("proj-ok", { name: "X" });
    expect(ok).toBe(false);
    expect(updateDoc).toHaveBeenCalled();
  });

  it("isValidProjectId helper works for edge cases", () => {
    expect(isValidProjectId("goodId_123")).toBe(true);
    expect(isValidProjectId("")).toBe(false);
    expect(isValidProjectId("a/../../b")).toBe(false);
    expect(isValidProjectId(null)).toBe(false);
    expect(isValidProjectId("a".repeat(300))).toBe(false);
  });
});
