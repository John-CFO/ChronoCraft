/////////////////////////firestoreSchemas.sec.ts////////////////////////

// This file is used to validate user data from firestore
// also validate is TOTP exists and is enabled

///////////////////////////////////////////////////////////////////

import { z } from "zod";

///////////////////////////////////////////////////////////////////

// validate Firestore Doc ID
/**
 * @AppSec
 */
export const isValidFirestoreDocId = (id: unknown): id is string => {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 255) return false;
  const reservedChars = /[.$[\]#\/]/;
  return !reservedChars.test(id);
};

/**
 * Preprocessors
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

const safeEmailSchema = z.email().max(254);

// FirestoreUserSchema
// - createdAt is optional (common for user docs that might not include it).
// - other fields validated with defaults where appropriate.
/**
 * @AppSec
 */
export const FirestoreUserSchema = z
  .object({
    uid: z.string().min(1).optional(), // WICHTIG: optional() für Lesen
    email: safeEmailSchema.optional(),
    pushToken: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    personalID: z.string().optional().nullable(),
    photoURL: z.string().url().optional().nullable(),
    firstLogin: z.boolean().optional().default(false),
    totpEnabled: z.boolean().optional().default(false),
    totpSecret: z.string().max(100).nullable().optional(),
    hasSeenHomeTour: z.boolean().optional().default(false),
    hasSeenVacationTour: z.boolean().optional().default(false),
    hasSeenWorkHoursTour: z.boolean().optional().default(false),
    hasSeenDetailsTour: z.boolean().optional().default(false),
    createdAt: timestampToDateOptional,
    lastAuth: timestampToDateOptional,
    mfaEnabled: z.boolean().optional().default(false),
  })
  .strict();

// validate the custom user data using the FirestoreUserSchema
/**
 * @AppSec
 */
export const FirestoreCustomUserSchema = FirestoreUserSchema.extend({
  uid: z.string().min(1), // UID from Auth-System
  // displayName: z.string().optional().nullable(),
  // personalID: z.string().optional().nullable(),
  // photoURL: z.url().optional().nullable(),
  // pushToken: z.string().optional().nullable(),
  // lastAuth: timestampToDateOptional,
  // mfaEnabled: z.boolean().optional().default(false),
}).strict();

// FirestoreProjectSchema
/**
 * @AppSec
 */
export const FirestoreProjectSchema = z
  .object({
    id: z.string().refine(isValidFirestoreDocId, "Invalid document ID"),
    name: z.string().min(1).max(100), // length limit validation
    uid: z.string(),
    createdAt: timestampToDateStrict, // required and strict
    isTracking: z.boolean().optional().default(false),
  })
  .strict();

// validate is TOTP exists and is enabled
/**
 * @AppSec
 */
export const TOTPUserSchema = z
  .object({
    totpEnabled: z.boolean().optional().default(false),
    totpSecret: z.string().max(100).nullable().optional(),
  })
  .strict();

// ProjectUpdateSchema
// - single place to validate what updates are allowed for a Project document.
// - strict(): unknown keys are rejected (prevents arbitrary fields being written).
/**
 * @AppSec
 */
export const ProjectUpdateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    archived: z.boolean().optional(),
    // fixed: use two args to satisfy this project's zod typings -> key and value as strings
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();

// validate the workhours global states
/**
 * @AppSec
 */
export const FirestoreWorkHoursSchema = z
  .object({
    elapsedTime: z.number().min(0).max(31536000).optional().default(0), // ~10 Years in seconds
    isWorking: z.boolean().optional().default(false),
    startWorkTime: timestampToDateOptional,
    currentDocId: z
      .string()
      .refine(isValidFirestoreDocId, "Invalid document ID")
      .nullable()
      .optional(),
    lastUpdatedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
      .optional(),

    // (optional with Defaults)
    expectedHours: z.number().min(0).max(24).optional().default(0), // Max 1 Day in Hours
    overHours: z.number().min(0).max(8760).optional().default(0), // Max 1 Year in seconds
    duration: z.number().min(0).max(8760).optional().default(0),
    userId: z
      .string()
      .refine(isValidFirestoreDocId, "Invalid user ID")
      .optional(),
    workDay: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
      .optional(),
  })
  .strict();

// helper function to validate the workhours schema
export const validateWorkHoursSchema = (data: unknown) =>
  FirestoreWorkHoursSchema.safeParse(data).success;

// export FirestoreProject explicid, based on FirestoreProjectSchema
export type FirestoreProject = z.infer<typeof FirestoreProjectSchema>;
