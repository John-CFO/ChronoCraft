///////////////////////// authSchemas.ts ////////////////////////

// This file is used to validate user inputs for login and registration

//////////////////////////////////////////////////////////////

import { z } from "zod";

//////////////////////////////////////////////////////////////

// validate login schema
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const LoginInputSchema = z.object({
  email: z.email({ message: "Please enter a valid E-Mail." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

// validate register schema
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const RegisterInputSchema = z.object({
  email: z.email({ message: "Please enter a valid E-Mail." }),
  password: z
    .string()
    .min(8, { message: "The password must be at least 8 characters long." })
    .refine(
      (pw) => (pw.match(/[-_!@#$%^&*(),.?\":{}|<>]/g) ?? []).length >= 2,
      { message: "The password must contain at least 2 special characters." }
    )
    .refine((pw) => /\d/.test(pw), {
      message: "The password must contain at least 1 number.",
    }),
});

// validate totp schema
/**
 * @AppSec // only for CLI-Purpose, kno real Security-Enforcement
 */
export const TotpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, { message: "TOTP must be 6 digits" });
