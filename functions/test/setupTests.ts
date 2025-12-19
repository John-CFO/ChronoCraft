///////////////// setupTests.ts //////////////////////

// This file contains central boundary-mocks for the unit tests
// It is used to mock the logger and prevent authentication fails in test suites

//////////////////////////////////////////////////////

jest.mock("../src/logging/logger", () => ({
  logEvent: jest.fn(),
}));
