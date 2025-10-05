/////////////////////////firestoreSchemas.ts////////////////////////

// This file is used to validate user data from firestore
// also validate is TOTP exists and is enabled

///////////////////////////////////////////////////////////////////

import { z } from "zod";

///////////////////////////////////////////////////////////////////

// validate Firestore Doc ID
export const isValidFirestoreDocId = (id: unknown): id is string => {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 1500) return false; // Firestore Limit
  const reservedChars = /[.$[\]#\/]/;
  return !reservedChars.test(id);
};

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

const safeEmailSchema = z.string().email().max(254);
/**
 * FirestoreUserSchema
 * - createdAt is optional (common for user docs that might not include it).
 * - other fields validated with defaults where appropriate.
 */
export const FirestoreUserSchema = z
  .object({
    email: safeEmailSchema.optional(),
    firstLogin: z.boolean().optional().default(false),
    totpEnabled: z.boolean().optional().default(false),
    totpSecret: z.string().max(100).nullable().optional(),
    hasSeenHomeTour: z.boolean().optional().default(false),
    hasSeenVacationTour: z.boolean().optional().default(false),
    hasSeenWorkHoursTour: z.boolean().optional().default(false),
    hasSeenDetailsTour: z.boolean().optional().default(false),
    createdAt: timestampToDateOptional, // optional, converted to Date when present
  })
  .strict();

// FirestoreProjectSchema
export const FirestoreProjectSchema = z
  .object({
    id: z.string().refine(isValidFirestoreDocId, "Invalid document ID"),
    name: z.string().min(1).max(100), // length limit validation
    createdAt: timestampToDateStrict, // required and strict
  })
  .strict();

// validate is TOTP exists and is enabled
export const TOTPUserSchema = z
  .object({
    totpEnabled: z.boolean().optional().default(false),
    totpSecret: z.string().max(100).nullable().optional(),
  })
  .strict();

// validate the workhours global states
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
