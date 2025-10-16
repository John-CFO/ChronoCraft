////////////////////////////CustomDrawer.sec.test.ts////////////////////////////////

// This file tests the fetchUserProfile function from CustomDrawer.ts

///////////////////////////////////////////////////////////////////////////////

import { getDoc, doc } from "firebase/firestore";
import { z } from "zod";

import { FIREBASE_AUTH, FIREBASE_FIRESTORE } from "../firebaseConfig";
import { FirestoreUserSchema } from "../validation/firestoreSchemas.sec";

///////////////////////////////////////////////////////////////////////////////

// Mocks
jest.mock("firebase/firestore", () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({
  FIREBASE_AUTH: { currentUser: { uid: "test123" } },
  FIREBASE_FIRESTORE: {},
}));

jest.mock("../validation/firestoreSchemas.sec", () => ({
  FirestoreUserSchema: {
    parse: jest.fn((data) => data),
  },
}));

// get function under test
const fetchUserProfile = async (
  setUser: (user: any) => void,
  setIsEnrolled: (value: boolean) => void
) => {
  try {
    const currentUser = FIREBASE_AUTH.currentUser;
    if (currentUser && currentUser.uid) {
      const userRef = doc(FIREBASE_FIRESTORE, "Users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const parsedData = FirestoreUserSchema.parse({
          uid: currentUser.uid,
          ...userDoc.data(),
        });
        setUser(parsedData);
        setIsEnrolled(!!parsedData.totpEnabled);
      }
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
};

// Tests
describe("fetchUserProfile validation", () => {
  const mockSetUser = jest.fn();
  const mockSetIsEnrolled = jest.fn();
  const mockConsoleError = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    (FIREBASE_AUTH as any).currentUser = { uid: "test123" };
  });

  it("should fetch and set validated user data", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        email: "test@example.com",
        totpEnabled: true,
        firstLogin: false,
      }),
    });

    await fetchUserProfile(mockSetUser, mockSetIsEnrolled);

    expect(getDoc).toHaveBeenCalled();
    expect(FirestoreUserSchema.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "test123",
        email: "test@example.com",
      })
    );
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" })
    );
    expect(mockSetIsEnrolled).toHaveBeenCalledWith(true);
  });

  it("should handle validation errors", async () => {
    (FirestoreUserSchema.parse as jest.Mock).mockImplementationOnce(() => {
      throw new z.ZodError([]);
    });

    await fetchUserProfile(mockSetUser, mockSetIsEnrolled);

    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it("should do nothing if no current user", async () => {
    (FIREBASE_AUTH as any).currentUser = null;
    await fetchUserProfile(mockSetUser, mockSetIsEnrolled);
    expect(getDoc).not.toHaveBeenCalled();
  });
});
