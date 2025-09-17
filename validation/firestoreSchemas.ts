/////////////////////////firestoreSchemas.ts////////////////////////

// This file is used to validate user data from firestore

//////////////////////////////////////////////////////////////

import { z } from "zod";

//////////////////////////////////////////////////////////////

// validate the user data from firestore
export const FirestoreUserSchema = z.object({
  email: z.email().optional(),
  firstLogin: z.boolean().optional().default(false),
  totpEnabled: z.boolean().optional().default(false),
  totpSecret: z.string().nullable().optional(),
  hasSeenHomeTour: z.boolean().optional().default(false),
  // createdAt: optional, Firestore Timestamp -> to check existence
  createdAt: z.any().optional(),
});
export type FirestoreUser = z.infer<typeof FirestoreUserSchema>;
