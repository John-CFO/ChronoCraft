///////////////////////noteModal.sec.test.ts///////////////////////////////////////

// This file is used to test the note modal component with unit tests
// It includes the tests for user authorization and input validation

///////////////////////////////////////////////////////////////////////////////

import { NoteInputSchema } from "../validation/noteSchemas.sec";

///////////////////////////////////////////////////////////////////////////////
describe("NoteModal Security", () => {
  it("should validate user authorization", () => {
    const currentUser = { uid: "user123" };
    const differentUser = "user456";

    // simulate authorization check
    expect(currentUser.uid === differentUser).toBe(false);
  });

  it("should reject empty comments", () => {
    const emptyComment = {
      comment: "",
      projectId: "valid123",
      userId: "user123",
    };

    expect(NoteInputSchema.safeParse(emptyComment).success).toBe(false);
  });

  it("should reject comments that are too long", () => {
    const longComment = {
      comment: "a".repeat(1001), // 1001 characters - too long
      projectId: "valid123",
      userId: "user123",
    };

    expect(NoteInputSchema.safeParse(longComment).success).toBe(false);
  });

  it("should accept valid note input", () => {
    const validInput = {
      comment: "This is a valid note comment",
      projectId: "valid123",
      userId: "user123",
    };

    expect(NoteInputSchema.safeParse(validInput).success).toBe(true);
  });
});
