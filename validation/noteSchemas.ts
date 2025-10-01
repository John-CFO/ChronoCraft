////////////////////noteSchemas.ts////////////////////////////

// This file is used to validate user inputs for notes

//////////////////////////////////////////////////////////////

import { z } from "zod";

//////////////////////////////////////////////////////////////

// validate the timestamp and convert to Date
const timestampToDateStrict = z.preprocess((val) => {
  if (val && typeof (val as any).toDate === "function")
    return (val as any).toDate();
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  return val;
}, z.date());

// validate note schema
export const FirestoreNoteSchema = z.object({
  id: z.string(),
  comment: z.string().min(1).max(1000),
  createdAt: timestampToDateStrict,
  uid: z.string(),
});

// validate note input
export const NoteInputSchema = z.object({
  comment: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment too long")
    .refine((val) => !val.includes("<script>"), "Invalid input detected")
    .refine((val) => !val.includes("javascript:"), "Invalid input detected"),
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export type FirestoreNote = z.infer<typeof FirestoreNoteSchema>;
export type NoteInput = z.infer<typeof NoteInputSchema>;
