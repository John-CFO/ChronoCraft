//////////////////// progressSchemas.ts ////////////////////////////

// This file is used to validate user inputs for progress

//////////////////////////////////////////////////////////////////

import { z } from "zod";

//////////////////////////////////////////////////////////////////

// validate progress schema
// Optional: local ID-Validators for Client-Inputs
const isValidLocalDocId = (id: unknown): id is string => {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 255) return false;
  return true;
};
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const MaxWorkHoursSchema = z.object({
  maxWorkHours: z.number().int().min(1).max(10000),
  projectId: z.string().min(1).refine(isValidLocalDocId, "Invalid project ID"),
  userId: z.string().min(1).refine(isValidLocalDocId, "Invalid user ID"),
});

export type MaxWorkHoursInput = z.infer<typeof MaxWorkHoursSchema>;
