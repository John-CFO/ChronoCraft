/////////////////////// editProfileSchemas.ts ////////////////////////////

// Schema for updates to a user's profile coming from the client.
// Only accepts allowed fields and constrains formats.

////////////////////////////////////////////////////////////////////////

import { z } from "zod";

////////////////////////////////////////////////////////////////////////

/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const FirestoreUserUpdateSchema = z
  .object({
    displayName: z
      .string()
      .optional()
      .transform((s) => (s === "" ? undefined : s))
      .refine((s) => s === undefined || (s.length >= 1 && s.length <= 100), {
        message: "Display name must be between 1 and 100 chars",
      }),
    personalID: z
      .string()
      .optional()
      .transform((s) => (s === "" ? undefined : s))
      .refine((s) => s === undefined || /^[0-9A-Za-z\-_]{4,30}$/.test(s), {
        message: "Invalid personal ID",
      }),
    photoURL: z.url().optional(),
  })
  .strict();

export type FirestoreUserUpdate = z.infer<typeof FirestoreUserUpdateSchema>;
