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

  const blockedKeys = new Set([
    "password",
    "token",
    "secret",
    "otp",
    "code",
    "link",
    "email",
  ]);

  const sanitizeValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }

    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !blockedKeys.has(key.toLowerCase()))
          .map(([key, val]) => [key, sanitizeValue(val)]),
      );
    }

    return value;
  };

  return sanitizeValue(metadata) as Record<string, unknown>;
}
