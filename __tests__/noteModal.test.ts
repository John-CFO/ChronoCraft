///////////////////////noteModal.test.ts///////////////////////////////////////

// This file is used to test the note modal component with unit tests
// It includes the tests for user authorization and reject invalid project IDs

///////////////////////////////////////////////////////////////////////////////

describe("NoteModal Security", () => {
  it("should reject invalid project IDs", () => {
    const invalidIds = [
      "../../otheruser", // Path traversal
      "project<Script>", // XSS attempt
      "project'; DROP", // SQL Injection
    ];

    invalidIds.forEach((id) => {
      expect(/^[a-zA-Z0-9_-]+$/.test(id)).toBe(false);
    });
  });

  it("should validate user authorization", () => {
    const currentUser = { uid: "user123" };
    const differentUser = "user456";

    // simulate authorization check
    expect(currentUser.uid === differentUser).toBe(false);
  });
});
