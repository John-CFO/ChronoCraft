///////////// sanatizeLogMetadata.test.ts //////////////

// This files contains the unit-test for the sanatizeLogMetadata function

////////////////////////////////////////////////////////

import { logEvent } from "../../../src/utils/logger";

////////////////////////////////////////////////////////

describe("sanatizeLogMetadata", () => {
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
});
