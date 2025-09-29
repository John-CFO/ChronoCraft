//////////////////////asyncStorageSchemas.ts/////////////////////////

// This file is used to validate user data from AsyncStorage

/////////////////////////////////////////////////////////////////////

import { z } from "zod";

/////////////////////////////////////////////////////////////////////

// Schema for WorkTimeTracker state stored in AsyncStorage
// Validates the structure and types of locally stored tracking data
// Prevents storage of malicious or corrupted data
export const AsyncStorageWorkTrackerSchema = z.object({
  isWorking: z.boolean(),
  startWorkTime: z.string().nullable().optional(),
  elapsedTime: z
    .number()
    .min(0)
    .max(24 * 30), // Max 30 days of work
  accumulatedDuration: z
    .number()
    .min(0)
    .max(24 * 365), // Max 1 year
  currentDocId: z.string().nullable().optional(),
});

export type AsyncStorageWorkTracker = z.infer<
  typeof AsyncStorageWorkTrackerSchema
>;

// Schema for general app state in AsyncStorage
export const AsyncStorageAppStateSchema = z.object({
  elapsedTime: z.number().min(0).optional(),
  lastActiveTime: z.string().optional(),
});

export type AsyncStorageAppState = z.infer<typeof AsyncStorageAppStateSchema>;
