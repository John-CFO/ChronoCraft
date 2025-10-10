///////////////////////editProfileSchemas.ts////////////////////////////

// Schema for updates to a user's profile coming from the client.
// Only accepts allowed fields and constrains formats.

////////////////////////////////////////////////////////////////////////

import { z } from "zod";

////////////////////////////////////////////////////////////////////////

export const FirestoreUserUpdateSchema = z
  .object({
    displayName: z
      .string()
      .min(1, "Display name too short")
      .max(100, "Display name too long")
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    personalID: z
      .string()
      .regex(/^[0-9A-Za-z\-_]{4,30}$/, "Invalid personal ID")
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    photoURL: z.url().optional(),
  })
  .strict();

export type FirestoreUserUpdate = z.infer<typeof FirestoreUserUpdateSchema>;
