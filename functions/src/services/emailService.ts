//////////////////////// emailService.ts /////////////////////////////////////

// This file contains the functions for sending emails

///////////////////////////////////////////////////////////////////////////////

import { Resend } from "resend";

import { ConfigurationError } from "../errors/domain.errors";

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
export async function sendPasswordResetEmail(to: string, link: string) {
  const resend = getResendClient();
  const from = getFromAddress();
  const result = await resend.emails.send({
    from,
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>Use the most recent email if you requested multiple resets.</p>
      <p>Older links may no longer work.</p>
      <p><a href="${link}">Click here to reset your password</a></p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `,
  });

  if (!result || (result as any).error) {
    throw new Error(`Resend send failed: ${JSON.stringify(result)}`);
  }
  return result;
}
