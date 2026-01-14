/////////////////// noteSchemas.client.test.ts //////////////////////

// This file is used to validate user inputs for notes on the client side

/////////////////////////////////////////////////////////////////////

import { NoteInputSchema } from "../validation/noteSchemas";

/////////////////////////////////////////////////////////////////////

describe("NoteInputSchema (client)", () => {
  const validBase = {
    comment: "This is a valid note",
    projectId: "project_123",
    userId: "user_456",
  };

  it("accepts valid note input", () => {
    const result = NoteInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects empty comment", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      comment: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects comment longer than 1000 chars", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      comment: "a".repeat(1001),
    });

    expect(result.success).toBe(false);
  });

  it("accepts comment at max length boundary (1000)", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      comment: "a".repeat(1000),
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty projectId", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      projectId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects projectId longer than 255 chars", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      projectId: "a".repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      userId: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects userId longer than 255 chars", () => {
    const result = NoteInputSchema.safeParse({
      ...validBase,
      userId: "a".repeat(256),
    });

    expect(result.success).toBe(false);
  });
});
