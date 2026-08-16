//////////////////////// noteSchemas.ts ////////////////////////////

// This file is used to validate user inputs for notes

//////////////////////////////////////////////////////////////

import { z } from "zod";
import i18n from "../components/services/lacalization/i18n";

//////////////////////////////////////////////////////////////

// Optional: ID-Validator for local IDs (AsyncStorage / temporal IDs)
const isValidLocalDocId = (id: unknown): id is string => {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > 255) return false;
  return true;
};

// validate note input (from client)
export const NoteInputSchema = z.object({
  comment: z
    .string()
    .min(1, i18n.t("validation.commentEmpty"))
    .max(1000, i18n.t("validation.commentTooLong")),
  projectId: z
    .string()
    .min(1, i18n.t("validation.projectIdRequired"))
    .refine(isValidLocalDocId, i18n.t("validation.invalidProjectId")),
  userId: z
    .string()
    .min(1, i18n.t("validation.userIdRequired"))
    .refine(isValidLocalDocId, i18n.t("validation.invalidUserId")),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;
