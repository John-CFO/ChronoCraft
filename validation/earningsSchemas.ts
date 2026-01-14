///////////////////////// earningsSchemas.ts ////////////////////////////

// This file is used to validate user inputs for earnings on the client side
// Backend / Firestore-specific schemas have been removed

///////////////////////////////////////////////////////////////////////

import { z } from "zod";

///////////////////////////////////////////////////////////////////////

// Client-only: hourly rate input validation
/**
 * @AppSec  // only for CLI-Purpose, kno real Security-Enforcement
 */
export const HourlyRateSchema = z.object({
  hourlyRate: z
    .number()
    .min(0, "Hourly rate cannot be negative")
    .max(300, "Hourly rate cannot exceed 300")
    .refine((val) => !isNaN(val), "Hourly rate must be a valid number"),
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

// Typen für Client-Input
export type HourlyRateInput = z.infer<typeof HourlyRateSchema>;
