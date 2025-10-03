//////////////////////////////noteList.test.ts//////////////////////////////////

// This file is used to test the note list component with unit tests
// It includes the tests for invalid project IDs and invalid note data

///////////////////////////////////////////////////////////////////////////////

import { FirestoreNoteSchema } from "../validation/noteSchemas";

///////////////////////////////////////////////////////////////////////////////

describe("NoteList Security", () => {
  it("should filter invalid note data", () => {
    const invalidNotes = [
      { id: "1", comment: "", createdAt: new Date(), uid: "user123" }, // Empty comment
      {
        id: "2",
        comment: "a".repeat(1001),
        createdAt: new Date(),
        uid: "user123",
      }, // Too long
      { id: "3", comment: "Valid", createdAt: "invalid-date", uid: "user123" }, // Invalid date
    ];

    // test that FirestoreNoteSchema rejects invalid data
    invalidNotes.forEach((note) => {
      expect(FirestoreNoteSchema.safeParse(note).success).toBe(false);
    });
  });

  it("should accept valid note data", () => {
    const validNote = {
      id: "note1",
      comment: "Valid note content",
      createdAt: new Date(),
      uid: "user123",
    };

    expect(FirestoreNoteSchema.safeParse(validNote).success).toBe(true);
  });
});
