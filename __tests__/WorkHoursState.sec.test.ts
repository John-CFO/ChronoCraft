/////////////////////////////WorkHoursState.sec.test.ts////////////////////////////

// This file is used to test the WorkHoursState with unit tests
// It includes the tests for the input validation, authentication bypass protection,
// and data sanitization

///////////////////////////////////////////////////////////////////////////////

import { jest } from "@jest/globals";

///////////////////////////////////////////////////////////////////////////////

// Mocks
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
}));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock("../firebaseConfig", () => ({
  FIREBASE_FIRESTORE: {},
}));

// Import the component
const WorkHoursState = require("../components/WorkHoursState").default;

// Firebase-Imports
const { getAuth } = require("firebase/auth");
const { doc, getDoc, setDoc } = require("firebase/firestore");

describe("WorkHoursState — AppSec Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Input Validation
  it("rejects invalid Firestore document numeric or date values", async () => {
    const mockUser = { uid: "test-user" };
    getAuth.mockReturnValue({ currentUser: mockUser });

    // Mock invalid Firestore document
    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        elapsedTime: -100, // negative time value - invalid
        isWorking: "true", // wrong Type
        currentDocId: "invalid/id", // Firestore reserved characters
      }),
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const originalElapsedTime = WorkHoursState.getState().elapsedTime;

    await WorkHoursState.getState().loadState();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid WorkHours doc:",
      expect.any(Object)
    );
    expect(WorkHoursState.getState().elapsedTime).toBe(originalElapsedTime);

    consoleSpy.mockRestore();
  });

  // testing rejection of invalid data
  it("does not save invalid data violating schema constraints", async () => {
    const mockUser = { uid: "test-user" };
    getAuth.mockReturnValue({ currentUser: mockUser });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockDocRef = {};
    doc.mockReturnValue(mockDocRef);

    // add invalid data
    WorkHoursState.getState().setElapsedTime(-5);
    WorkHoursState.getState().setCurrentDocId("invalid/id");

    await WorkHoursState.getState().saveState();

    expect(setDoc).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Invalid WorkHours state:",
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  // Schema Validation
  it("validates Firestore data against schema before processing", async () => {
    const mockUser = { uid: "test-user" };
    getAuth.mockReturnValue({ currentUser: mockUser });

    const testDate = new Date("2024-01-01T10:00:00Z");

    doc.mockReturnValue({});
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        elapsedTime: 3600,
        isWorking: true,
        startWorkTime: testDate,
        currentDocId: "valid-id-123",
        lastUpdatedDate: "2024-01-01",
      }),
    });

    await WorkHoursState.getState().loadState();

    expect(WorkHoursState.getState().elapsedTime).toBe(3600);
    expect(WorkHoursState.getState().isWorking).toBe(true);
  });

  // Authentication Bypass Protection
  it("prevents Firestore operations without valid authentication", async () => {
    getAuth.mockReturnValue({ currentUser: null });

    await WorkHoursState.getState().loadState();
    await WorkHoursState.getState().saveState();

    expect(doc).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });

  // testing only valid data is written
  it("only writes valid, schema-confirmed data to Firestore", async () => {
    const mockUser = { uid: "test-user" };
    getAuth.mockReturnValue({ currentUser: mockUser });

    const mockDocRef = {};
    doc.mockReturnValue(mockDocRef);
    setDoc.mockResolvedValue(undefined);

    // Set state with valid data
    WorkHoursState.getState().setElapsedTime(3600);
    WorkHoursState.getState().setIsWorking(true);
    WorkHoursState.getState().setCurrentDocId("valid-document-id");

    await WorkHoursState.getState().saveState();

    expect(setDoc).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        elapsedTime: 3600,
        isWorking: true,
        currentDocId: "valid-document-id",
      })
    );
  });

  // Basic state operations
  it("handles basic state operations correctly", () => {
    WorkHoursState.getState().setUserTimeZone("Europe/Berlin");
    WorkHoursState.getState().setExpectedHours("8");

    expect(WorkHoursState.getState().useTimeZone).toBe("Europe/Berlin");
    expect(WorkHoursState.getState().expectedHours).toBe("8");
  });
});
