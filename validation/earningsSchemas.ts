///////////////////////// earningsSchemas.ts ////////////////////////////

// This file is used to validate user inputs for earnings on the client side
// Backend / Firestore-specific schemas have been removed

///////////////////////////////////////////////////////////////////////

import { z } from "zod";
import i18n from "../components/services/localization/i18n";

///////////////////////////////////////////////////////////////////////

// Client-only: hourly rate input validation
/**
 * @AppSec  // only for CLI-Purpose, kno real Security-Enforcement
 */
export const HourlyRateSchema = z.object({
  hourlyRate: z
    .number()
    .min(0, i18n.t("validation.hourlyRateNegative"))
    .max(300, i18n.t("validation.hourlyRateMax"))
    .refine((val) => !isNaN(val), i18n.t("validation.hourlyRateInvalid")),
  projectId: z.string().min(1, i18n.t("validation.projectIdRequired")),
  userId: z.string().min(1, i18n.t("validation.userIdRequired")),
});

// Typen für Client-Input
export type HourlyRateInput = z.infer<typeof HourlyRateSchema>;
