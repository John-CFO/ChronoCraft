//////////////////////asyncStorageSchemas.ts/////////////////////////

// This file is used to validate user data from AsyncStorage

/////////////////////////////////////////////////////////////////////

import { z } from "zod";

/////////////////////////////////////////////////////////////////////

// AsyncStora ID Validation
const isValidAsyncStorageDocId = (id: unknown): id is string => {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 500) return false;
  return true;
};

// ISO-Date Validation
const isoDateStringSchema = z.string().refine((dateString) => {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}, "Must be valid date string");

// Schema for WorkTimeTracker state stored in AsyncStorage
// Validates the structure and types of locally stored tracking data
// Prevents storage of malicious or corrupted data
export const AsyncStorageWorkTrackerSchema = z
  .object({
    isWorking: z.boolean(),
    startWorkTime: isoDateStringSchema.nullable().optional(),
    elapsedTime: z
      .number()
      .min(0)
      .max(864000) // Max 1 Day in seconds
      .refine((t) => Number.isInteger(t), "Must be whole number"),
    accumulatedDuration: z
      .number()
      .min(0)
      .max(31536000) // Max 10 Years in seconds
      .refine((t) => Number.isInteger(t), "Must be whole number"),
    currentDocId: z
      .string()
      .refine(isValidAsyncStorageDocId, "Invalid document ID")
      .nullable()
      .optional(),
  })
  .strict();

// Schema for general app state in AsyncStorage
export const AsyncStorageAppStateSchema = z
  .object({
    elapsedTime: z.number().min(0).max(31536000).optional(), // Max 10 Years in seconds
    lastActiveTime: isoDateStringSchema.optional(),
  })
  .strict();
