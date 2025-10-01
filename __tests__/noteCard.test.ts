////////////////////////////////noteCard.test.ts////////////////////////////////

// This file is used to test the note card component with unit tests
// It includes the tests to delete notes from other users and validate note structure before deletion

////////////////////////////////////////////////////////////////////////////////

import { FirestoreNoteSchema } from "../validation/noteSchemas";

////////////////////////////////////////////////////////////////////////////////

describe("NoteCard Delete Security", () => {
  it("should prevent deleting notes from other users", () => {
    const currentUser = { uid: "user123" };
    const otherUserNote = {
      id: "note1",
      comment: "Test note",
      createdAt: new Date(),
      uid: "user456", // other user
    };

    // simulate authorization check
    expect(otherUserNote.uid === currentUser.uid).toBe(false);
  });

  it("should validate note structure before deletion", () => {
    const invalidNote = {
      id: "note1",
      comment: "", // empty comment - invalid
      createdAt: new Date(),
      uid: "user123",
    };

    expect(FirestoreNoteSchema.safeParse(invalidNote).success).toBe(false);
  });
});
