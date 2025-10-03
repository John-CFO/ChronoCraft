/////////////////////////earningsSchemas.ts////////////////////////////

// This file is used to validate user inputs for earnings and earnings from firestore

///////////////////////////////////////////////////////////////////////

import { z } from "zod";

///////////////////////////////////////////////////////////////////////

// hourly rate schema to check if the input is valid, if so, return the value
export const HourlyRateSchema = z.object({
  hourlyRate: z
    .number()
    .min(0, "Hourly rate cannot be negative")
    .max(300, "Hourly rate cannot exceed 300")
    .refine((val) => !isNaN(val), "Hourly rate must be a valid number"),
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const FirestoreEarningsSchema = z.object({
  hourlyRate: z.number().min(0).max(300).optional(),
  totalEarnings: z.number().min(0).optional(),
});

export type HourlyRateInput = z.infer<typeof HourlyRateSchema>;
export type FirestoreEarnings = z.infer<typeof FirestoreEarningsSchema>;
