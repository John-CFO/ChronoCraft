//__mocks__/admin_mock.ts

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: jest.fn(),
}));
