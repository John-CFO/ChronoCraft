////////////////////////// sanatizeLogger.ts ////////////////////////////

// This files contains the functions to sanitize log metadata
// It prevent sensitive information from being logged

///////////////////////////////////////////////////////////////////////////

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
