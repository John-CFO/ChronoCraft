/////////////////////////////PreventBackBTNSnap.sec.test.tsx/////////////////////////////

import { renderHook, waitFor, act } from "@testing-library/react-native";
import { onSnapshot } from "firebase/firestore";

import { usePreventBackWhileTracking } from "../components/PreventBackBTN";
import { ServiceProvider } from "../components/contexts/ServiceContext";
import { getValidatedDocFromSnapshot } from "../validation/getDocsWrapper.sec";
import { FirestoreProjectSchema } from "../validation/firestoreSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

// Mock Firestore
const mockUnsubscribe = jest.fn();
let mockSnapshotCallback: ((snapshot: any) => void) | null = null;

// Prepare mocks
jest.mock("firebase/firestore", () => ({
  onSnapshot: jest.fn((_, callback) => {
    mockSnapshotCallback = callback;
    return mockUnsubscribe;
  }),
  doc: jest.fn(() => ({ type: "document" })),
}));

jest.mock("../validation/getDocsWrapper.sec", () => ({
  getValidatedDocFromSnapshot: jest.fn(),
}));

// Helper function to wait for snapshot callback
const waitForSnapshotCallback = async (timeout = 1000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (mockSnapshotCallback) return mockSnapshotCallback;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Snapshot callback nicht gesetzt");
};

describe("usePreventBackWhileTracking snapshot validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshotCallback = null;
    mockUnsubscribe.mockClear();
  });

  // wrapper to provide ServiceProvider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ServiceProvider>{children}</ServiceProvider>
  );

  it("calls getValidatedDocFromSnapshot for valid snapshot", async () => {
    const mockDocSnap = {
      id: "abc",
      data: () => ({
        id: "abc",
        name: "Proj",
        createdAt: new Date(),
        isTracking: true,
      }),
      exists: () => true,
    };

    (getValidatedDocFromSnapshot as jest.Mock).mockReturnValue({
      id: "abc",
      name: "Proj",
      createdAt: new Date(),
      isTracking: true,
    });

    renderHook(() => usePreventBackWhileTracking("proj_1"), { wrapper });

    // whait for onSnapshot to be called
    await waitFor(() => {
      expect(onSnapshot).toHaveBeenCalled();
    });

    // get Snapshot Callback
    const snapshotCallback = await waitForSnapshotCallback();

    // simulate snapshot
    act(() => {
      snapshotCallback(mockDocSnap);
    });

    // check validation
    await waitFor(() => {
      expect(getValidatedDocFromSnapshot).toHaveBeenCalledTimes(1);
      expect(getValidatedDocFromSnapshot).toHaveBeenCalledWith(
        mockDocSnap,
        FirestoreProjectSchema
      );
    });
  });

  it("does not proceed if validator returns null", async () => {
    const mockDocSnapInvalid = {
      id: "bad",
      data: () => ({ id: "bad" }),
      exists: () => true,
    };

    (getValidatedDocFromSnapshot as jest.Mock).mockReturnValue(null);

    renderHook(() => usePreventBackWhileTracking("proj_1"), { wrapper });

    // whait for onSnapshot to be called the hook
    await waitFor(() => {
      expect(onSnapshot).toHaveBeenCalled();
    });

    // get Snapshot Callback
    const snapshotCallback = await waitForSnapshotCallback();

    // simulate snapshot
    act(() => {
      snapshotCallback(mockDocSnapInvalid);
    });

    // check validation
    await waitFor(() => {
      expect(getValidatedDocFromSnapshot).toHaveBeenCalledTimes(1);
      expect(getValidatedDocFromSnapshot).toHaveBeenCalledWith(
        mockDocSnapInvalid,
        FirestoreProjectSchema
      );
    });
  });
  // no further assertions about UI/side-effects here — test's sole responsibility:
  // the snapshot is validated before any app logic consumes it (appsec).
});
