/////////////////////////firestoreSchemas.ts////////////////////////

// This file is used to validate user data from firestore
// also validate is TOTP exists and is enabled

///////////////////////////////////////////////////////////////////

import { z } from "zod";

///////////////////////////////////////////////////////////////////
/**
 * Preprocessors
 *
 * - timestampToDateStrict: only accepts Firestore Timestamp-like (has toDate),
 *   Date instances or numbers (Unix ms). Any other input will be left unchanged
 *   and rejected by z.date(), so invalid types (e.g. string) fail validation.
 *
 * - timestampToDateOptional: same conversions but allows undefined/null (returns undefined),
 *   so the field can be optional.
 */
const timestampToDateStrict = z.preprocess((val) => {
  if (val && typeof (val as any).toDate === "function")
    return (val as any).toDate();
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  // return value unchanged so z.date() will reject invalid types (e.g. string)
  return val;
}, z.date());

const timestampToDateOptional = z.preprocess((val) => {
  if (val == null) return undefined;
  if (val && typeof (val as any).toDate === "function")
    return (val as any).toDate();
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  // invalid -> keep undefined so optional() accepts a missing value
  return undefined;
}, z.date().optional());

/**
 * FirestoreUserSchema
 * - createdAt is optional (common for user docs that might not include it).
 * - other fields validated with defaults where appropriate.
 */
export const FirestoreUserSchema = z.object({
  email: z.email().optional(),
  firstLogin: z.boolean().optional().default(false),
  totpEnabled: z.boolean().optional().default(false),
  totpSecret: z.string().nullable().optional(),
  hasSeenHomeTour: z.boolean().optional().default(false),
  hasSeenVacationTour: z.boolean().optional().default(false),
  hasSeenWorkHoursTour: z.boolean().optional().default(false),
  createdAt: timestampToDateOptional, // optional, converted to Date when present
});
export type FirestoreUser = z.infer<typeof FirestoreUserSchema>;

/**
 * FirestoreProjectSchema
 * - createdAt is REQUIRED and must be a valid Timestamp/Date/number (strict).
 * - notes is an array with each note having content and a strict timestamp.
 * - notes defaults to an empty array when missing.
 */
export const FirestoreNoteSchema = z.object({
  content: z.string(),
  timestamp: timestampToDateStrict,
});
export type FirestoreNote = z.infer<typeof FirestoreNoteSchema>;

export const FirestoreProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: timestampToDateStrict, // required and strict
  notes: z.array(FirestoreNoteSchema).default([]),
});
export type FirestoreProject = z.infer<typeof FirestoreProjectSchema>;

// validate is TOTP exists and is enabled
export const TOTPUserSchema = z.object({
  totpEnabled: z.boolean().optional().default(false),
  totpSecret: z.string().nullable().optional(),
});

export type TOTPUser = z.infer<typeof TOTPUserSchema>;

// validate the workhours global states
export const FirestoreWorkHoursSchema = z.object({
  elapsedTime: z.number().nonnegative().optional().default(0),
  isWorking: z.boolean().optional().default(false),
  startWorkTime: timestampToDateOptional, // accepts Timestamp/Date/number -> Date | undefined
  currentDocId: z.string().nullable().optional(),
  lastUpdatedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
});
export type FirestoreWorkHours = z.infer<typeof FirestoreWorkHoursSchema>;
