//////////////////////// emailService.ts /////////////////////////////////////

// This file contains the functions for sending emails

///////////////////////////////////////////////////////////////////////////////

import { Resend } from "resend";

import { ConfigurationError } from "../errors/domain.errors";
import { getTranslation } from "../services/localization/i18n";

//////////////////////////////////////////////////////////////////////////////

// cached instance (lazy init)
let resendClient: Resend | null = null;

// function to get the resend client
function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new ConfigurationError("Missing RESEND_API_KEY");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

// function to get the from address
function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new ConfigurationError("Missing RESEND_FROM_EMAIL");
  }

  const normalized = from.trim();

  if (normalized.includes("\n") || normalized.includes("\r")) {
    throw new ConfigurationError("Invalid RESEND_FROM_EMAIL");
  }

  // enforce valid email format OR "Name <email>"
  const isSimpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  const isNamedEmail = /^.+<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(normalized);

  if (!isSimpleEmail && !isNamedEmail) {
    throw new ConfigurationError(
      "RESEND_FROM_EMAIL must be 'email@domain' or 'Name <email@domain>'",
    );
  }

  return normalized;
}

// function to send a password reset email
export async function sendPasswordResetEmail(
  to: string,
  link: string,
  language?: string | null,
) {
  // use getTranslation to get the current language
  const t = await getTranslation(language);

  const resend = getResendClient();
  const from = getFromAddress();
  const result = await resend.emails.send({
    from,
    to,
    subject: t("auth.passwordResetSubject"),
    html: `
  <p>${t("auth.passwordResetRequested")}</p>
  <p>${t("auth.passwordResetMostRecent")}</p>
  <p>${t("auth.passwordResetOlderLinks")}</p>
  <p><a href="${link}">${t("auth.passwordResetLink")}</a></p>
  <p>${t("auth.passwordResetIgnore")}</p>
`,
  });

  if (!result || (result as any).error) {
    throw new ConfigurationError("Password reset email delivery failed");
  }
  return result;
}
