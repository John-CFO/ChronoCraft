/////////////////////////////authHelper.sec.test.ts////////////////////////////////

// Tests AppSec-relevante Logik von handleAuthStateChange

///////////////////////////////////////////////////////////////////////////////

import { getDoc } from "firebase/firestore";

import { FirestoreUserSchema } from "../validation/firestoreSchemas.sec";
import { handleAuthStateChange } from "../validation/authHelper.sec";

///////////////////////////////////////////////////////////////////////////////

// Firebase & Schema Mocks
jest.mock("firebase/firestore", () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock("../firebaseConfig", () => ({
  FIREBASE_FIRESTORE: {},
}));

jest.mock("../validation/firestoreSchemas.sec", () => ({
  FirestoreUserSchema: {
    safeParse: jest.fn(),
  },
}));

// Tests
describe("handleAuthStateChange (AppSec validation)", () => {
  const mockSetUser = jest.fn();
  const mockUser = { uid: "123", email: "test@example.com" } as any;

  // clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should logout if no user is passed", async () => {
    await handleAuthStateChange(null, mockSetUser);
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it("should set user if Firestore doc does not exist", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await handleAuthStateChange(mockUser, mockSetUser);

    expect(getDoc).toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith(mockUser);
  });

  it("should block login if Firestore data is invalid (schema fail)", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ email: "invalid@example" }),
    });
    (FirestoreUserSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: new Error("invalid schema"),
    });

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    await handleAuthStateChange(mockUser, mockSetUser);
    warnSpy.mockRestore();

    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it("should block login if totpEnabled is true", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ email: "t@example.com", totpEnabled: true }),
    });
    (FirestoreUserSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { totpEnabled: true },
    });

    await handleAuthStateChange(mockUser, mockSetUser);
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  it("should set user if totpEnabled is false", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ email: "t@example.com", totpEnabled: false }),
    });
    (FirestoreUserSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: { totpEnabled: false },
    });

    await handleAuthStateChange(mockUser, mockSetUser);
    expect(mockSetUser).toHaveBeenCalledWith(mockUser);
  });

  it("should log and set user if an exception occurs", async () => {
    (getDoc as jest.Mock).mockRejectedValueOnce(new Error("Firestore down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await handleAuthStateChange(mockUser, mockSetUser);

    errSpy.mockRestore();
    expect(mockSetUser).toHaveBeenCalledWith(mockUser);
  });
});
