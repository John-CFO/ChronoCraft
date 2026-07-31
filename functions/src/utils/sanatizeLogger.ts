////////////////////////// sanatizeLogger.ts ////////////////////////////

// This files contains the functions to sanitize log metadata
// It prevent sensitive information from being logged

///////////////////////////////////////////////////////////////////////////

// function to sanitize log metadata
export function sanitizeLogMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /otp/i,
    /code/i,
    /link/i,
    /email/i,
    /authorization/i,
    /cookie/i,
    /session/i,
  ];

  const sanitizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .filter(
            ([key]) => !sensitivePatterns.some((pattern) => pattern.test(key)),
          )
          .map(([key, val]) => [key, sanitizeValue(val)]),
      );
    }

    return value;
  };

  return sanitizeValue(metadata) as Record<string, unknown>;
}

// function to sanitize log messages
export function sanitizeLogMessage(message: string): string {
  return (
    message
      // mask e-mail adress
      .replace(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
        "[REDACTED_EMAIL]",
      )
      // mask bearer token
      .replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, "[REDACTED_TOKEN]")
  );
}
