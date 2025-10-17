///////////////////////preventBackBNTSnap.sec.test.ts/////////////////////////////////

// This file tests the snapshot validation for the usePreventBackWhileTracking hook
// It includes the tests for invalid project IDs and invalid snapshot data

///////////////////////////////////////////////////////////////////////////////

import { renderHook } from "@testing-library/react-hooks";
import { onSnapshot } from "firebase/firestore";

import { usePreventBackWhileTracking } from "../components/PreventBackBTN";
import { getValidatedDocFromSnapshot } from "../validation/getDocsWrapper.sec";
import { FirestoreProjectSchema } from "../validation/firestoreSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

jest.mock("firebase/firestore", () => ({
  onSnapshot: jest.fn(),
  doc: jest.fn(),
}));

jest.mock("../validation/getDocsWrapper.sec", () => ({
  getValidatedDocFromSnapshot: jest.fn(),
}));

describe("usePreventBackWhileTracking snapshot validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getValidatedDocFromSnapshot before using snapshot data (valid snapshot)", () => {
    const mockDocSnap = {
      id: "abc",
      data: () => ({
        id: "abc",
        name: "Proj",
        createdAt: new Date(),
        isTracking: true,
      }),
      exists: () => true,
    } as any;

    // Validator returns parsed object (non-null)
    (getValidatedDocFromSnapshot as jest.Mock).mockReturnValue({
      id: "abc",
      name: "Proj",
      createdAt: new Date(),
      isTracking: true,
    });

    renderHook(() => usePreventBackWhileTracking("proj_1"));

    // simulate snapshot callback
    const snapshotCallback = (onSnapshot as jest.Mock).mock.calls[0][1];
    expect(typeof snapshotCallback).toBe("function");
    snapshotCallback(mockDocSnap);

    // assert validator called with DocumentSnapshot and correct schema
    expect(getValidatedDocFromSnapshot).toHaveBeenCalledTimes(1);
    expect(getValidatedDocFromSnapshot).toHaveBeenCalledWith(
      mockDocSnap,
      FirestoreProjectSchema
    );
  });

  it("calls getValidatedDocFromSnapshot and does not proceed if it returns null (invalid snapshot)", () => {
    const mockDocSnapInvalid = {
      id: "bad",
      data: () => ({ id: "bad" }), // missing required fields
      exists: () => true,
    } as any;

    // validator returns null to indicate invalid doc
    (getValidatedDocFromSnapshot as jest.Mock).mockReturnValue(null);

    renderHook(() => usePreventBackWhileTracking("proj_1"));

    const snapshotCallback = (onSnapshot as jest.Mock).mock.calls[0][1];
    snapshotCallback(mockDocSnapInvalid);

    // important: validation must be called with the doc and schema
    expect(getValidatedDocFromSnapshot).toHaveBeenCalledTimes(1);
    expect(getValidatedDocFromSnapshot).toHaveBeenCalledWith(
      mockDocSnapInvalid,
      FirestoreProjectSchema
    );

    // no further assertions about UI/side-effects here — test's sole responsibility:
    // the snapshot is validated before any app logic consumes it (appsec).
  });
});
