///////////////////////// authSchemas.ts ////////////////////////

// This file is used to validate user inputs for login and registration

//////////////////////////////////////////////////////////////

import { z } from "zod";
import i18n from "../components/services/lacalization/i18n";

//////////////////////////////////////////////////////////////

// validate login schema
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const LoginInputSchema = z.object({
  email: z.email({
    message: i18n.t("validation.invalidEmail"),
  }),
  password: z.string().min(1, {
    message: i18n.t("validation.passwordEmpty"),
  }),
});

// validate register schema
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const RegisterInputSchema = z.object({
  email: z.email({
    message: i18n.t("validation.invalidEmail"),
  }),
  password: z
    .string()
    .min(8, {
      message: i18n.t("validation.passwordMinLength"),
    })
    .refine(
      (pw) => (pw.match(/[-_!@#$%^&*(),.?\":{}|<>]/g) ?? []).length >= 2,
      {
        message: i18n.t("validation.passwordSpecialCharacters"),
      },
    )
    .refine((pw) => /\d/.test(pw), {
      message: i18n.t("validation.passwordNumber"),
    }),
});

// validate totp schema
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const TotpCodeSchema = z.string().regex(/^\d{6}$/, {
  message: i18n.t("validation.totpDigits"),
});
