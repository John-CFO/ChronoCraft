//////////////////////////////vacationSchemas.sec.ts////////////////////////////

// This file validates user data coming from the VacationForm

///////////////////////////////////////////////////////////////////////////

import { z } from "zod";

///////////////////////////////////////////////////////////////////////////

/**
 * MarkedDate: flexible object for each date entry in the calendar.
 * We keep it permissive (only expected keys validated) but strict on types.
 * Use .catchall(z.any()) to allow extra keys (replacement for .passthrough()).
 */
export const MarkedDateEntrySchema = z
  .object({
    selected: z.boolean().optional(),
    color: z
      .string()
      .regex(/^#?[0-9A-Fa-f]{3,8}$/, "invalid color")
      .optional(),
    textColor: z
      .string()
      .regex(/^#?[0-9A-Fa-f]{3,8}$/, "invalid textColor")
      .optional(),
  })
  .strict();
/**
 * MarkedDates: record where keys are ISO date strings (YYYY-MM-DD)
 * and values must match MarkedDateEntrySchema
 */
export const MarkedDatesSchema = z.record(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  MarkedDateEntrySchema
);

/**
 * Schema for the input coming from the VacationForm (validated before addDoc)
 * - startDate: first day (string in YYYY-MM-DD)
 * - markedDates: map validated by MarkedDatesSchema
 */
/**
 * @AppSec
 */
export const VacationInputSchema = z.object({
  uid: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  markedDates: MarkedDatesSchema,
});
export type VacationInput = z.infer<typeof VacationInputSchema>;

// Schema for Firestore-stored Vacation document
const timestampToDateOptional = z.preprocess((val) => {
  if (val == null) return undefined;
  if ((val as any)?.toDate && typeof (val as any).toDate === "function")
    return (val as any).toDate();
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  return undefined;
}, z.date().optional());

export const FirestoreVacationSchema = z.object({
  id: z.string().optional(),
  uid: z.string(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  markedDates: MarkedDatesSchema,
  createdAt: timestampToDateOptional,
  reminderDuration: z.number().optional(),
});
export type FirestoreVacation = z.infer<typeof FirestoreVacationSchema>;
