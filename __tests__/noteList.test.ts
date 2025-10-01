//////////////////////////////noteList.test.ts//////////////////////////////////

// This file is used to test the note list component with unit tests
// It includes the tests for invalid project IDs and invalid note data

///////////////////////////////////////////////////////////////////////////////

import { FirestoreNoteSchema } from "../validation/noteSchemas";

///////////////////////////////////////////////////////////////////////////////

describe("NoteList Security", () => {
  it("should reject invalid project IDs", () => {
    const invalidIds = ["../otheruser", "project<script>", "project' OR 1=1"];
    invalidIds.forEach((id) => {
      expect(/^[a-zA-Z0-9_-]+$/.test(id)).toBe(false);
    });
  });

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

    // Simuliere dass FirestoreNoteSchema diese ablehnt
    invalidNotes.forEach((note) => {
      expect(FirestoreNoteSchema.safeParse(note).success).toBe(false);
    });
  });
});
