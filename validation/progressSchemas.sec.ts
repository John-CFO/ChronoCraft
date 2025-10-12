////////////////////progressSchemas.sec.ts////////////////////////////

// This file is used to validate user inputs for progress

//////////////////////////////////////////////////////////////////

import { z } from "zod";

//////////////////////////////////////////////////////////////////

// validate progress schema
export const MaxWorkHoursSchema = z.object({
  maxWorkHours: z.number().int().min(1).max(10000),
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export type MaxWorkHoursInput = z.infer<typeof MaxWorkHoursSchema>;
