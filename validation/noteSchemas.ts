//////////////////////// noteSchemas.ts ////////////////////////////

// This file is used to validate user inputs for notes

//////////////////////////////////////////////////////////////

import { z } from "zod";

//////////////////////////////////////////////////////////////

// Optional: ID-Validator for local IDs (AsyncStorage / temporal IDs)
const isValidLocalDocId = (id: unknown): id is string => {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 255) return false;
  return true;
};

// validate note input (from client)
export const NoteInputSchema = z.object({
  comment: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment too long"),
  projectId: z
    .string()
    .min(1, "Project ID is required")
    .refine(isValidLocalDocId, "Invalid project ID"),
  userId: z
    .string()
    .min(1, "User ID is required")
    .refine(isValidLocalDocId, "Invalid user ID"),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;
