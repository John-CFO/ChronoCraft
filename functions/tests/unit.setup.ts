//////////////////////////////////// unit.setup.ts ///////////////////////////////////

// This file contains the setup for the unit tests.

//////////////////////////////////////////////////////////////////////////////////////

import type { CallableRequest } from "firebase-functions/v2/https";
import type { DecodedIdToken } from "firebase-admin/auth";

//////////////////////////////////////////////////////////////////////////////////////

// Mock Firebase Admin SDK for Unit Tests
jest.mock("firebase-admin", () => {
  const mockFieldValue = {
    serverTimestamp: jest.fn(),
  };

  const mockFirestore = () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      })),
    })),
  });

  const mockAuth = () => ({
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    verifyIdToken: jest.fn(),
  });

  return {
    initializeApp: jest.fn(),
    apps: [],
    app: jest.fn(() => ({
      firestore: mockFirestore(),
      auth: mockAuth(),
    })),
    firestore: Object.assign(jest.fn(mockFirestore), {
      FieldValue: mockFieldValue,
    }),
    auth: jest.fn(mockAuth),
    credential: {
      cert: jest.fn(),
    },
  };
});

// Mock crypto module
jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  timingSafeEqual: jest.fn(() => true),
}));

// Jest Configuration
jest.setTimeout(30000);

// Global Test Helpers
globalThis.mockRequest = <T = any>(
  data: T = {} as T,
  uid?: string,
  token?: DecodedIdToken,
  headers: Record<string, string> = {},
): CallableRequest<T> => ({
  data,
  auth: uid
    ? {
        uid,
        token: token || ({} as DecodedIdToken),
      }
    : undefined,
  rawRequest: {
    headers,
    body: Buffer.from(JSON.stringify(data)),
    method: "POST",
    url: "/",
    get: (name: string) => headers[name],
  } as any,
});

globalThis.mockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn(),
  };
  return res;
};

// Type Declarations
declare global {
  var mockRequest: <T = any>(
    data?: T,
    uid?: string,
    token?: import("firebase-admin/auth").DecodedIdToken,
    headers?: Record<string, string>,
  ) => CallableRequest<T>;

  var mockResponse: () => {
    status: jest.Mock<any, any>;
    json: jest.Mock<any, any>;
    send: jest.Mock<any, any>;
    end: jest.Mock<any, any>;
  };
}

// Cleanup
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Export empty to enforce ES/TS module
export {};
