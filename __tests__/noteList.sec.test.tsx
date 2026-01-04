//////////////////////////////noteList.sec.test.ts//////////////////////////////////

// This file is used to test the note list component with unit tests
// It includes the tests for invalid project IDs and invalid note data

///////////////////////////////////////////////////////////////////////////////

import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useNotes } from "../hooks/fetchNotesHook";
import { ServiceProvider } from "../components/contexts/ServiceContext";
import { getDocs } from "firebase/firestore";

import { FIREBASE_AUTH } from "../firebaseConfig";

///////////////////////////////////////////////////////////////////////////////

jest.mock("firebase/firestore", () => ({
  onSnapshot: jest.fn(() => jest.fn()),
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({
  FIREBASE_FIRESTORE: {},
  FIREBASE_AUTH: { currentUser: null },
}));

describe("useNotes Hook - AppSec & Validation", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(FIREBASE_AUTH, "currentUser", {
      writable: true,
      value: null,
    });
  });

  // wrapper to provide ServiceProvider
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ServiceProvider>{children}</ServiceProvider>
  );

  it("should set error for invalid projectId", async () => {
    const { result } = renderHook(() => useNotes(""), { wrapper });

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    expect(result.current.error?.message).toBe("Invalid project ID");
    expect(result.current.notes).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it("should set error if user is not authenticated", async () => {
    Object.defineProperty(FIREBASE_AUTH, "currentUser", {
      writable: true,
      value: null,
    });

    const { result } = renderHook(() => useNotes("validProjectId"), {
      wrapper,
    });

    await act(async () => {});

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("User not authenticated");
    expect(result.current.notes).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it("should filter invalid note data and return only valid notes", async () => {
    Object.defineProperty(FIREBASE_AUTH, "currentUser", {
      writable: true,
      value: { uid: "user123" },
    });

    const mockDocs = [
      {
        id: "1",
        data: () => ({ comment: "", createdAt: new Date(), uid: "user123" }),
      },
      {
        id: "2",
        data: () => ({
          comment: "Valid",
          createdAt: new Date(),
          uid: "user123",
        }),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

    const { result } = renderHook(() => useNotes("validProjectId"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.notes).toHaveLength(1);
    expect(result.current.notes[0].comment).toBe("Valid");
    expect(result.current.loading).toBe(false);
  });

  it("should allow removing a note using removeNote", async () => {
    Object.defineProperty(FIREBASE_AUTH, "currentUser", {
      writable: true,
      value: { uid: "user123" },
    });

    const mockDocs = [
      {
        id: "1",
        data: () => ({
          comment: "Note 1",
          createdAt: new Date(),
          uid: "user123",
        }),
      },
      {
        id: "2",
        data: () => ({
          comment: "Note 2",
          createdAt: new Date(),
          uid: "user123",
        }),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({ docs: mockDocs });

    const { result } = renderHook(() => useNotes("validProjectId"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // synchroner removeNote
    act(() => {
      result.current.removeNote("1");
    });

    // danach sicherheitshalber warten, bis das Hook-State aktualisiert wurde
    await waitFor(() => {
      expect(result.current.notes).toHaveLength(1);
      expect(result.current.notes[0].id).toBe("2");
    });
  });
});
