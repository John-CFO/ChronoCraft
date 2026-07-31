///////////// sanatizeLogMetadata.test.ts //////////////

// This file contains the unit tests for the sanitizeLogMetadata function

////////////////////////////////////////////////////////

import { logEvent } from "../../../src/utils/logger";

////////////////////////////////////////////////////////

describe("sanitizeLogMetadata", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should remove sensitive metadata before logging", () => {
    logEvent("test", "info", {
      uid: "user123",
      password: "secret",
      token: "abc123",
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining("secret"),
    );
  });

  it("should remove sensitive metadata with matching patterns", () => {
    logEvent("test", "info", {
      userEmail: "test@example.com",
      accessToken: "abc123",
      sessionId: "session-secret",
      uid: "user123",
    });

    const logOutput = (console.info as jest.Mock).mock.calls[0][0];

    expect(logOutput).not.toContain("test@example.com");
    expect(logOutput).not.toContain("abc123");
    expect(logOutput).not.toContain("session-secret");
    expect(logOutput).toContain("user123");
  });
});

describe("sanitizeLogMetadata", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should remove sensitive metadata before logging", () => {
    logEvent("test", "info", {
      uid: "user123",
      password: "secret",
      token: "abc123",
    });

    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining("secret"),
    );
  });

  it("should remove sensitive metadata with matching patterns", () => {
    logEvent("test", "info", {
      userEmail: "test@example.com",
      accessToken: "abc123",
      uid: "user123",
    });

    const logOutput = (console.info as jest.Mock).mock.calls[0][0];

    expect(logOutput).not.toContain("test@example.com");
    expect(logOutput).not.toContain("abc123");
    expect(logOutput).toContain("user123");
  });
});

describe("sanitizeLogMessage", () => {
  beforeEach(() => {
    jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should redact sensitive data in log messages", () => {
    logEvent("Login failed for test@example.com with Bearer abc123", "info");

    const logOutput = (console.info as jest.Mock).mock.calls[0][0];

    expect(logOutput).not.toContain("test@example.com");
    expect(logOutput).not.toContain("Bearer abc123");
    expect(logOutput).toContain("[REDACTED_EMAIL]");
    expect(logOutput).toContain("[REDACTED_TOKEN]");
  });
});
