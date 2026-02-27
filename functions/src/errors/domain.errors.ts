//////////////////////////////// domain.errors.ts ///////////////////////////////

// This file contains the domain errors used in the application

///////////////////////////////////////////////////////////////////////////////

export class DomainError extends Error {
  // define the constructor method
  constructor(
    message: string,
    public code: string,
    public userMessage?: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  // return the JSON representation of the error
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined,
    };
  }
}

// Export specified domain errors with messages and security wrapper
export class ValidationError extends DomainError {
  constructor(message: string, details?: any) {
    super(
      message,
      "validation-error",
      "Invalid input. Please check your data.",
      details,
    );
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, details?: any) {
    super(
      `${resource} not found`,
      "not-found",
      `The requested ${resource} was not found.`,
      details,
    );
  }
}

export class PermissionError extends DomainError {
  constructor(action: string, details?: any) {
    super(
      `Permission denied for ${action}`,
      "permission-denied",
      "You do not have permission to perform this action.",
      details,
    );
  }
}

export class AuthenticationError extends DomainError {
  constructor(message: string = "Authentication required", details?: any) {
    super(
      message,
      "authentication-error",
      "Please log in to continue.",
      details,
    );
  }
}

export class RateLimitError extends DomainError {
  public retryAfterSeconds?: number;

  constructor(details?: any, retryAfterSeconds?: number) {
    super(
      "Rate limit exceeded",
      "rate-limit-exceeded",
      retryAfterSeconds
        ? `Too many requests. Try again in ${retryAfterSeconds} seconds.`
        : "Too many requests. Please try again later.",
      details,
    );

    if (retryAfterSeconds) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, userMessage?: string, details?: any) {
    super(
      message,
      "business-rule-error",
      userMessage || "A business rule was violated.",
      details,
    );
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string, details?: any) {
    super(
      message,
      "configuration-error",
      "System configuration error.",
      details,
    );
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, "database-error", "A database error occurred.", details);
  }
}

export class ExternalServiceError extends DomainError {
  constructor(service: string, details?: any) {
    super(
      `External service ${service} error`,
      "external-service-error",
      "An external service is temporarily unavailable.",
      details,
    );
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: any) {
    super(
      message,
      "conflict-error",
      "A conflict occurred with the current state.",
      details,
    );
  }
}
